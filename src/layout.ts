import { Message } from '@lumino/messaging';

import { PanelLayout, Widget } from '@lumino/widgets';

import { DocumentRegistry, DocumentModel } from '@jupyterlab/docregistry';

import { Vector2, Color } from 'three';

import { URDFControls } from './controls';

import { URDFRenderer } from './renderer';

import { URDFLoadingManager } from './robot';

import { URDFEditor } from './editor/urdf-editor';

import { LinkSelector } from './editor/linkSelector';

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
  private _editor: URDFEditor;
  private _interactionEditor: LinkSelector;
  private _context: DocumentRegistry.IContext<DocumentModel> | null = null;
  private _selectedLinks: {
    parent: { name: string | null; obj: any | null };
    child: { name: string | null; obj: any | null };
  } = {
    parent: { name: null, obj: null },
    child: { name: null, obj: null }
  };
  private _editorControlsSetup = false;

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
    this._editor = new URDFEditor();
    this._interactionEditor = new LinkSelector(this._renderer);
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
    this._refreshJointControls();
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
    if (this._editorControlsSetup) {
      // Prevent setting up controls multiple times
      return;
    }
    this._editorControlsSetup = true;

    const addJointCallback = () => {
      if (
        this._context &&
        this._selectedLinks.parent.name &&
        this._selectedLinks.child.name
      ) {
        const urdfString = this._context.model.toString();
        const editorControls = this._controlsPanel.controls.editor;
        const isModifying =
          editorControls.selectedJoint.getValue() !== 'New Joint';

        let newUrdfString;

        if (isModifying) {
          // Modify existing joint
          newUrdfString = this._editor.modifyJoint(
            urdfString,
            editorControls.selectedJoint.getValue(),
            {
              type: editorControls.type.getValue(),
              parent: this._selectedLinks.parent.name,
              child: this._selectedLinks.child.name,
              origin_xyz: editorControls.origin_xyz.getValue(),
              origin_rpy: editorControls.origin_rpy.getValue(),
              axis_xyz: editorControls.axis_xyz.getValue(),
              lower: editorControls.lower.getValue(),
              upper: editorControls.upper.getValue(),
              effort: editorControls.effort.getValue(),
              velocity: editorControls.velocity.getValue()
            }
          );
        } else {
          // Add new joint
          newUrdfString = this._editor.addJoint(urdfString, {
            name: editorControls.name.getValue(),
            type: editorControls.type.getValue(),
            parent: this._selectedLinks.parent.name,
            child: this._selectedLinks.child.name,
            origin_xyz: editorControls.origin_xyz.getValue(),
            origin_rpy: editorControls.origin_rpy.getValue(),
            axis_xyz: editorControls.axis_xyz.getValue(),
            lower: editorControls.lower.getValue(),
            upper: editorControls.upper.getValue(),
            effort: editorControls.effort.getValue(),
            velocity: editorControls.velocity.getValue()
          });
        }

        this._context.model.fromString(newUrdfString);

        // Update the robot model and refresh joint controls
        this.updateURDF(newUrdfString);

        this._selectedLinks.parent = { name: null, obj: null };
        this._selectedLinks.child = { name: null, obj: null };
        editorControls.parent.setValue('none');
        editorControls.child.setValue('none');
        editorControls.selectedJoint.setValue('New Joint');
        this._interactionEditor.clearHighlights();
      }
    };

    const linkNames = Object.keys(this._loader.robotModel.links);
    const jointNames = Object.keys(this._loader.robotModel.joints);
    const editorControls = this._controlsPanel.createEditorControls(
      addJointCallback,
      linkNames,
      jointNames
    );

    // Connect the cursor link selection mode
    editorControls.mode.onChange((enabled: boolean) => {
      this._interactionEditor.setLinkSelectorMode(enabled);
    });

    // Handle joint selection for modification
    editorControls.selectedJoint.onChange((selectedJoint: string) => {
      const isModifying = selectedJoint !== 'New Joint';

      // Update button text
      editorControls.add.__li.querySelector('.property-name').textContent =
        isModifying ? 'Update Joint' : 'Add Joint';

      if (isModifying) {
        const joint = this._loader.robotModel.joints[selectedJoint];
        const jointElement = this._getJointElementFromURDF(selectedJoint);

        if (joint && jointElement) {
          editorControls.type.setValue(joint.jointType);

          // Get parent and child links
          const parentLink =
            jointElement
              .getElementsByTagName('parent')[0]
              ?.getAttribute('link') || 'none';
          const childLink =
            jointElement
              .getElementsByTagName('child')[0]
              ?.getAttribute('link') || 'none';
          editorControls.parent.setValue(parentLink);
          editorControls.child.setValue(childLink);

          // Get origin values
          const origin = jointElement.getElementsByTagName('origin')[0];
          editorControls.origin_xyz.setValue(
            origin?.getAttribute('xyz') || '0 0 0'
          );
          editorControls.origin_rpy.setValue(
            origin?.getAttribute('rpy') || '0 0 0'
          );

          // Get axis values
          const axis = jointElement.getElementsByTagName('axis')[0];
          editorControls.axis_xyz.setValue(
            axis?.getAttribute('xyz') || '0 0 1'
          );

          // Get limit, effort and velocity values
          const limit = jointElement.getElementsByTagName('limit')[0];
          editorControls.lower.setValue(limit?.getAttribute('lower') || '-1.0');
          editorControls.upper.setValue(limit?.getAttribute('upper') || '1.0');
          editorControls.effort.setValue(
            limit?.getAttribute('effort') || '0.0'
          );
          editorControls.velocity.setValue(
            limit?.getAttribute('velocity') || '0.0'
          );

          this._updateSelectedLinksFromJoint(parentLink, childLink);
        }
      } else {
        // Clear fields for new joint
        editorControls.name.setValue('new_joint');
        editorControls.type.setValue('revolute');
        editorControls.parent.setValue('none');
        editorControls.child.setValue('none');
        editorControls.origin_xyz.setValue('0 0 0');
        editorControls.origin_rpy.setValue('0 0 0');
        editorControls.axis_xyz.setValue('0 0 1');
        editorControls.lower.setValue('-1.0');
        editorControls.upper.setValue('1.0');
        editorControls.effort.setValue('0.0');
        editorControls.velocity.setValue('0.0');

        this._selectedLinks.parent = { name: null, obj: null };
        this._selectedLinks.child = { name: null, obj: null };
        this._interactionEditor.clearHighlights();
      }
    });

    const updateJointName = () => {
      const p = this._selectedLinks.parent.name;
      const c = this._selectedLinks.child.name;
      let newName = 'new_joint';
      if (p && c) {
        newName = `${p}_to_${c}_joint`;
      } else if (p) {
        newName = `${p}_to_..._joint`;
      } else if (c) {
        newName = `..._to_${c}_joint`;
      }
      editorControls.name.setValue(newName);
    };

    this._interactionEditor.linkSelected.connect((sender, selectedObject) => {
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

      // Case 1: Clicked on the currently selected parent link to unselect it.
      if (this._selectedLinks.parent.name === linkName) {
        this._interactionEditor.unHighlightLink('parent');
        this._selectedLinks.parent = { name: null, obj: null };
        editorControls.parent.setValue('none');
        updateJointName();
        return;
      }

      // Case 2: Clicked on the currently selected child link to unselect it.
      if (this._selectedLinks.child.name === linkName) {
        this._interactionEditor.unHighlightLink('child');
        this._selectedLinks.child = { name: null, obj: null };
        editorControls.child.setValue('none');
        updateJointName();
        return;
      }

      // Prevent selecting the same link as both parent and child
      if (
        this._selectedLinks.parent.name === linkName ||
        this._selectedLinks.child.name === linkName
      ) {
        return;
      }

      // Case 3: No parent is selected yet.
      if (!this._selectedLinks.parent.name) {
        this._selectedLinks.parent = { name: linkName, obj: linkObject };
        editorControls.parent.setValue(linkName);
        this._interactionEditor.highlightLink(linkObject, 'parent');
        updateJointName();
        return;
      }

      // Case 4: Parent is selected, but child is not.
      if (!this._selectedLinks.child.name) {
        this._selectedLinks.child = { name: linkName, obj: linkObject };
        editorControls.child.setValue(linkName);
        this._interactionEditor.highlightLink(linkObject, 'child');
        updateJointName();
        return;
      }

      // Case 5: Both parent and child are selected, so reset and set new parent.
      this._interactionEditor.clearHighlights();
      this._selectedLinks.parent = { name: linkName, obj: linkObject };
      this._selectedLinks.child = { name: null, obj: null };
      editorControls.parent.setValue(linkName);
      editorControls.child.setValue('none');
      this._interactionEditor.highlightLink(linkObject, 'parent');
      updateJointName();
    });

    // Add a handler for joint type changes to show/hide relevant fields
    editorControls.type.onChange((type: string) => {
      const axisControl = editorControls.axis_xyz;
      const limitControls = [
        editorControls.lower,
        editorControls.upper,
        editorControls.effort,
        editorControls.velocity
      ];

      // Show/hide axis based on type
      const needsAxis = [
        'revolute',
        'continuous',
        'prismatic',
        'planar'
      ].includes(type);
      axisControl.__li.style.display = needsAxis ? '' : 'none';

      // Show/hide limits based on type
      const needsLimits = ['revolute', 'prismatic'].includes(type);
      limitControls.forEach(c => {
        c.__li.style.display = needsLimits ? '' : 'none';
      });
    });

    editorControls.type.domElement.dispatchEvent(new Event('change'));

    editorControls.parent.onChange((linkName: string) => {
      // Prevent selecting the same link as the child
      if (linkName !== 'none' && linkName === this._selectedLinks.child.name) {
        editorControls.parent.setValue(
          this._selectedLinks.parent.name || 'none'
        );
        return;
      }
      if (linkName === 'none') {
        this._interactionEditor.unHighlightLink('parent');
        this._selectedLinks.parent = { name: null, obj: null };
      } else {
        const link = this._loader.robotModel.links[linkName];
        const linkObject = link.children.find((c: any) => c.isURDFVisual)
          ?.children[0];
        this._selectedLinks.parent = { name: linkName, obj: linkObject };
        this._interactionEditor.highlightLink(linkObject, 'parent');
      }
      updateJointName();
    });

    editorControls.child.onChange((linkName: string) => {
      // Prevent selecting the same link as the parent
      if (linkName !== 'none' && linkName === this._selectedLinks.parent.name) {
        editorControls.child.setValue(this._selectedLinks.child.name || 'none'); // Revert
        return;
      }
      if (linkName === 'none') {
        this._interactionEditor.unHighlightLink('child');
        this._selectedLinks.child = { name: null, obj: null };
      } else {
        const link = this._loader.robotModel.links[linkName];
        const linkObject = link.children.find((c: any) => c.isURDFVisual)
          ?.children[0];
        this._selectedLinks.child = { name: linkName, obj: linkObject };
        this._interactionEditor.highlightLink(linkObject, 'child');
      }
      updateJointName();
    });
  }

  /**
   * Helper method to get joint element from URDF XML
   */
  private _getJointElementFromURDF(jointName: string): Element | null {
    if (!this._context) {
      return null;
    }

    const parser = new DOMParser();
    const urdf = parser.parseFromString(
      this._context.model.toString(),
      'application/xml'
    );
    const joints = urdf.getElementsByTagName('joint');

    for (let i = 0; i < joints.length; i++) {
      if (joints[i].getAttribute('name') === jointName) {
        return joints[i];
      }
    }
    return null;
  }

  /**
   * Helper method to update selected links based on joint parent/child
   */
  private _updateSelectedLinksFromJoint(
    parentLink: string,
    childLink: string
  ): void {
    if (parentLink !== 'none') {
      const link = this._loader.robotModel.links[parentLink];
      const linkObject = link?.children.find((c: any) => c.isURDFVisual)
        ?.children[0];
      this._selectedLinks.parent = { name: parentLink, obj: linkObject };
      if (linkObject) {
        this._interactionEditor.highlightLink(linkObject, 'parent');
      }
    }

    if (childLink !== 'none') {
      const link = this._loader.robotModel.links[childLink];
      const linkObject = link?.children.find((c: any) => c.isURDFVisual)
        ?.children[0];
      this._selectedLinks.child = { name: childLink, obj: linkObject };
      if (linkObject) {
        this._interactionEditor.highlightLink(linkObject, 'child');
      }
    }
  }

  /**
   * Refreshes the joint controls by clearing and recreating them
   */
  private _refreshJointControls(): void {
    // Clear existing joint controls
    Object.keys(this._controlsPanel.controls.joints).forEach(jointName => {
      this._controlsPanel.jointsFolder.remove(
        this._controlsPanel.controls.joints[jointName]
      );
    });
    this._controlsPanel.controls.joints = {};

    // Recreate joint controls with updated robot model
    this._setJointControls();
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
