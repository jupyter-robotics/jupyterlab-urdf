import { Message } from '@lumino/messaging';

import { PanelLayout, Widget } from '@lumino/widgets';

import { DocumentRegistry, DocumentModel } from '@jupyterlab/docregistry';

import { Vector2, Color } from 'three';

import { URDFControls } from './controls';

import { URDFRenderer } from './renderer';

import { URDFLoadingManager } from './robot';

import { UrdfEditor } from './urdf-editor';

interface IURDFColors {
  sky: Color;
  ground: Color;
}

/**
 * URDFLayout: A layout panel to host the URDF viewer
 */
export class URDFLayout extends PanelLayout {
  private _host: HTMLElement;
  private _controlsPanel: URDFControls;
  private _renderer: URDFRenderer;
  private _colors: IURDFColors;
  private _loader: URDFLoadingManager;
  private _editor: UrdfEditor;
  private _context: DocumentRegistry.IContext<DocumentModel> | null = null;
  private _selectedLinks: {
    parent: { name: string | null; obj: any | null };
    child: { name: string | null; obj: any | null };
  } = {
    parent: { name: null, obj: null },
    child: { name: null, obj: null }
  };

  /**
   * Construct a `URDFLayout`
   */
  constructor() {
    super();

    // Creating container for URDF viewer and
    // output area to render execution replies
    this._host = document.createElement('div');

    this._colors = {
      sky: this._getThemeColor('--jp-layout-color1') || new Color(0x263238),
      ground: this._getThemeColor('--jp-layout-color2') || new Color(0x263238)
    };

    this._renderer = new URDFRenderer(this._colors.sky, this._colors.ground);
    this._controlsPanel = new URDFControls();
    this._loader = new URDFLoadingManager();
    this._editor = new UrdfEditor();
  }

  /**
   * Dispose of the resources held by the widget
   */
  dispose(): void {
    this._renderer.dispose();
    this._loader.dispose();
    super.dispose();
  }

  /**
   * Init the URDF layout
   */
  init(): void {
    super.init();

    // Add the URDF container into the DOM
    this.addWidget(new Widget({ node: this._host }));
  }

  /**
   * Create an iterator over the widgets in the layout
   */
  iter(): Iterator<Widget> {
    return [][Symbol.iterator]();
  }

  /**
   * Remove a widget from the layout
   *
   * @param widget - The `widget` to remove
   */
  removeWidget(widget: Widget): void {
    return;
  }

  /**
   * Updates the viewer with any new changes on the file
   *
   * @param urdfString - The contents of the file with the new changes
   */
  updateURDF(urdfString: string): void {
    this._loader.setRobot(urdfString);
    this._renderer.setRobot(this._loader.robotModel);
  }

  /**
   * Sets the robot model initially and configures loader with default values
   *
   * @param context - Contains the URDF file and its parameters
   */
  setURDF(context: DocumentRegistry.IContext<DocumentModel>): void {
    this._context = context;
    // Default to parent directory of URDF file
    const filePath = context.path;
    const parentDir = filePath.substring(0, filePath.lastIndexOf('/'));
    this._loader.setWorkingPath(parentDir);

    this._loader.onLoad = () => {
      this._renderer.setRobot(this._loader.robotModel);
      this._setControls();
    };

    this._loader.setRobot(context.model.toString());

    if (this._loader.isReady) {
      this._renderer.setRobot(this._loader.robotModel);
      this._setControls();
    }
  }

  /**
   * Retrieves the values for any color variable declared in CSS
   *
   * @param colorName - The variable name of the color. Ex: '--jp-layout-color1'
   * @returns - The values of the color as a three.js Color
   */
  private _getThemeColor(colorName: string): Color | void {
    const colorString = window
      .getComputedStyle(document.documentElement)
      .getPropertyValue(colorName);
    return this._parseColor(colorString);
  }

  /**
   * Converts keyword or hex color definitions into three.js Color
   *
   * @param color - A color string such as: 'red', '#aaa', or '#232323'
   * @returns - The same color transformed to a three.js Color
   */
  private _parseColor(color: string): Color | void {
    let parsedColor;
    if (color[0] !== '#') {
      // Color name such as 'white'
      parsedColor = new Color(color);
    } else {
      if (color.length === 4) {
        // Shorthand hex value such as '#eee'
        const expandedColor =
          color[1] + color[1] + color[2] + color[2] + color[3] + color[3];
        parsedColor = new Color(Number('0x' + expandedColor));
      } else if (color.length === 7) {
        // Long hex value such as '#ffffff'
        parsedColor = new Color(Number('0x' + color.substring(1)));
      }
    }
    return parsedColor;
  }

  /**
   * Set the callback functions for each of item in the controls panel
   */
  private _setControls(): void {
    if (!this._loader.isReady) {
      return;
    }

    this._setPathControls();
    this._setSceneControls();
    this._setJointControls();
    this._setLightControls();
    this._setEditorControls();
  }

  /**
   * Set callback for changing working directory to given user input and
   * render again.
   */
  private _setPathControls(): void {
    const pathControl = this._controlsPanel.createWorkspaceControls(
      this._loader.workingPath
    );
    pathControl.onChange((newPath: string = pathControl.object['Path']) => {
      this._loader.setWorkingPath(newPath);
      this.updateURDF('');
    });
  }

  /**
   * Call renderer when scene colors are changed in the controls panel.
   */
  private _setSceneControls(): void {
    const sceneControl = this._controlsPanel.createSceneControls(
      this._colors.sky,
      this._colors.ground
    );
    sceneControl.background.onChange((newColor: number[]) =>
      this._renderer.setSkyColor(newColor)
    );
    sceneControl.grid.onChange((newColor: number[]) =>
      this._renderer.setGroundColor(newColor)
    );
    sceneControl.height.onChange((newHeight: number) =>
      this._renderer.setGridHeight(newHeight)
    );
  }

  /**
   * Set callback for each joint when the value changes in the controls panel.
   */
  private _setJointControls(): void {
    const jointControl = this._controlsPanel.createJointControls(
      this._loader.robotModel.joints
    );
    Object.keys(jointControl).forEach((jointName: string) => {
      jointControl[jointName].onChange((newValue = 0.0) => {
        this._setJointValue(jointName, newValue);
      });
    });
  }

  /**
   * Set callback for changing directional light position in the controls panel.
   */
  private _setLightControls(): void {
    const lightControl = this._controlsPanel.createLightControls();

    // Directional light callbacks
    const directional = lightControl.directional;

    // Position controls using spherical coordinates
    directional.position.altitude.onChange((newAltitude: number) => {
      const azimuth = directional.position.azimuth.getValue();
      this._renderer.setDirectionalLightPositionSpherical(newAltitude, azimuth);
    });

    directional.position.azimuth.onChange((newAzimuth: number) => {
      const altitude = directional.position.altitude.getValue();
      this._renderer.setDirectionalLightPositionSpherical(altitude, newAzimuth);
    });

    // Color and intensity controls
    directional.color.onChange((newColor: number[]) => {
      this._renderer.setDirectionalLightColor(newColor);
    });

    directional.intensity.onChange((newIntensity: number) => {
      this._renderer.setDirectionalLightIntensity(newIntensity);
    });

    // Helper visibility toggle for directional light
    directional.showHelper.onChange((visible: boolean) => {
      this._renderer.setDirectionalLightHelperVisibility(visible);
    });

    // Ambient light callbacks
    const ambient = lightControl.ambient;

    ambient.color.onChange((newColor: number[]) => {
      this._renderer.setAmbientLightColor(newColor);
    });

    ambient.intensity.onChange((newIntensity: number) => {
      this._renderer.setAmbientLightIntensity(newIntensity);
    });

    // Hemisphere light callbacks
    const hemisphere = lightControl.hemisphere;

    hemisphere.skyColor.onChange((newColor: number[]) => {
      this._renderer.setHemisphereLightSkyColor(newColor);
    });

    hemisphere.groundColor.onChange((newColor: number[]) => {
      this._renderer.setHemisphereLightGroundColor(newColor);
    });

    hemisphere.intensity.onChange((newIntensity: number) => {
      this._renderer.setHemisphereLightIntensity(newIntensity);
    });

    // Helper visibility toggle for hemisphere light
    hemisphere.showHelper.onChange((visible: boolean) => {
      this._renderer.setHemisphereLightHelperVisibility(visible);
    });
  }

  /**
   * Set value for robot joint
   *
   * @param jointName - The name of the joint to be set
   */
  private _setJointValue(jointName: string, newValue: number): void {
    this._loader.robotModel.setJointValue(jointName, newValue);
    this._renderer.setRobot(this._loader.robotModel);
  }

  /**
   * Set callbacks for the editor controls
   */
  private _setEditorControls(): void {
    const addJointCallback = () => {
      if (
        this._context &&
        this._selectedLinks.parent.name &&
        this._selectedLinks.child.name
      ) {
        const urdfString = this._context.model.toString();
        const editorControls = this._controlsPanel.controls.editor;
        const newUrdfString = this._editor.addJoint(urdfString, {
          name: editorControls.name.getValue(),
          type: editorControls.type.getValue(),
          parent: this._selectedLinks.parent.name,
          child: this._selectedLinks.child.name
        });
        this._context.model.fromString(newUrdfString);
        this._selectedLinks.parent = { name: null, obj: null };
        this._selectedLinks.child = { name: null, obj: null };
        editorControls.parent.setValue('none');
        editorControls.child.setValue('none');
        this._renderer.clearHighlights();
      }
    };

    const editorControls =
      this._controlsPanel.createEditorControls(addJointCallback);

    editorControls.mode.onChange((enabled: boolean) => {
      this._renderer.setEditorMode(enabled);
      if (!enabled) {
        this._selectedLinks.parent = { name: null, obj: null };
        this._selectedLinks.child = { name: null, obj: null };
        editorControls.parent.setValue('none');
        editorControls.child.setValue('none');
      }
    });

    this._renderer.linkSelected.connect((sender, selectedObject) => {
      let visual: any = selectedObject;
      while (visual && !visual.isURDFVisual) {
        visual = visual.parent;
      }

      if (!visual?.urdfNode?.parentElement) {
        console.error(
          'Could not find urdfNode for selected object',
          selectedObject
        );
        return;
      }

      const linkName = visual.urdfNode.parentElement.getAttribute('name');
      const linkObject = selectedObject;

      if (!this._selectedLinks.parent.name) {
        this._selectedLinks.parent = { name: linkName, obj: linkObject };
        editorControls.parent.setValue(linkName);
        this._renderer.highlightLink(linkObject, 'parent');
      } else if (!this._selectedLinks.child.name) {
        this._selectedLinks.child = { name: linkName, obj: linkObject };
        editorControls.child.setValue(linkName);
        this._renderer.highlightLink(linkObject, 'child');
      } else {
        this._renderer.clearHighlights();
        this._selectedLinks.parent = { name: linkName, obj: linkObject };
        this._selectedLinks.child = { name: null, obj: null };
        editorControls.parent.setValue(linkName);
        editorControls.child.setValue('none');
        this._renderer.highlightLink(linkObject, 'parent');
      }
    });
  }

  /**
   * Handle `update-request` messages sent to the widget
   */
  protected onUpdateRequest(msg: Message): void {
    this._resizeWorkspace();
  }

  /**
   * Handle `resize-request` messages sent to the widget
   */
  protected onResize(msg: Message): void {
    this._resizeWorkspace();
  }

  /**
   * Handle `fit-request` messages sent to the widget
   */
  protected onFitRequest(msg: Message): void {
    this._resizeWorkspace();
  }

  /**
   * Handle `after-attach` messages sent to the widget
   */
  protected onAfterAttach(msg: Message): void {
    this._renderer.redraw();
    this._host.appendChild(this._renderer.domElement);
    this._host.appendChild(this._renderer.css2dDomElement);
    this._renderer.setSize(
      this._renderer.domElement.clientWidth,
      this._renderer.domElement.clientHeight
    );
    this._host.appendChild(this._controlsPanel.domElement);
  }

  /**
   * Sets the size of the rendered view to match the host window size
   */
  private _resizeWorkspace(): void {
    const rect = this.parent?.node.getBoundingClientRect();
    this._host.style.height = rect?.height + 'px';

    const currentSize = this._renderer.getSize(new Vector2());
    this._renderer.setSize(
      rect?.width || currentSize.width,
      rect?.height || currentSize.height
    );
    this._renderer.setCss2dSize(
      rect?.width || currentSize.width,
      rect?.height || currentSize.height
    );

    this._renderer.redraw();
  }
}
