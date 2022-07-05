import { Message } from '@lumino/messaging';
import { PanelLayout, Widget } from '@lumino/widgets';
import { ArrayIterator, IIterator } from '@lumino/algorithm';

import ROSLIB from 'roslib';
import Amphion from 'amphion';
import { DefaultLoadingManager } from 'three';
import dat from 'dat.gui';

// Modify URLs for the RobotModel:
//https://github.com/RoboStack/amphion/blob/879045327e879d0bb6fe2c8eac54664de46ef675/src/core/urdf.ts#L22
DefaultLoadingManager.setURLModifier(url => {
  console.debug('THREE MANAGER:', url);
  return '/ros/pkgs' + url;
});

/**
 * A URDF layout to host the URDF viewer
 */
export class URDFLayout extends PanelLayout {
  private _host: HTMLElement;
  private _viewer: any;
  private _robotModel: any = null;
  private _gui: any;

  /**
   * Construct a `URDFLayout`
   */
  constructor() {
    super();

    // Creating container for URDF viewer and
    // output area to render execution replies
    this._host = document.createElement('div');
  }

  /**
   * Dispose of the resources held by the widget
   */
  dispose(): void {
    this._viewer.destroy();
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
  iter(): IIterator<Widget> {
    return new ArrayIterator([]);
  }

  /**
   * Remove a widget from the layout
   *
   * @param widget - The `widget` to remove
   */
  removeWidget(widget: Widget): void {
    return;
  }

  setURDF(data: string): void {
    // Load robot model
    if (this._robotModel !== null) {
      // Remove old robot model from visualization
      // Viewer -> Scene -> Group -> Robot Model
      this._robotModel.object.parent.remove(this._robotModel.object);
    }

    // https://github.com/RoboStack/amphion/blob/879045327e879d0bb6fe2c8eac54664de46ef675/src/core/urdf.ts#L46
    const ros = new ROSLIB.Ros();
    this._robotModel = new Amphion.RobotModel(ros, 'robot_description');
    this._robotModel.loadURDF(data, this._robotModel.onComplete, {});
    this._viewer.addVisualization(this._robotModel);

    // Create controller  panel
    this.setGUI();
  }

  /**
   * Create a GUI to set the joint angles / positions
   */
  setGUI(): void {
    this._gui = new dat.GUI({
      width: 310,
      autoPlace: false
    });

    // Adjust position so that it's attached to viewer
    this._gui.domElement.style.position = 'absolute';
    this._gui.domElement.style.top = 0;
    this._gui.domElement.style.right = 0;
    this._host.appendChild(this._gui.domElement);

    // Add option for configuring the scene background
    this._gui.addFolder('Scene').open();
    this.createColorControl();

    // Create new folder for the joints
    this._gui.addFolder('Robot Joints').open();
    Object.keys(this._robotModel.urdfObject.joints).forEach(jointName => {
      this.createJointSlider(jointName);
    });
  }

  /**
   * Set angle for revolute joints
   *
   * @param jointName - The name of the joint to be set
   */
  setJointAngle(jointName: string, newAngle: number): void {
    this._robotModel.urdfObject.joints[jointName].setAngle(newAngle);
  }

  /**
   * Creates a slider for each movable joint
   *
   * @param jointName - Name of joint as string
   */
  createJointSlider(jointName: string): void {
    // Retrieve joint
    const joint = this._robotModel.urdfObject.joints[jointName];

    // Skip joints which should not be moved
    if (joint._jointType === 'fixed') {
      return;
    }

    // Obtain joint limits
    let limitMin = joint.limit.lower;
    let limitMax = joint.limit.upper;

    // If the limits are not defined, set defaults to +/- 180 degrees
    if (limitMin === 0 && limitMax === 0) {
      limitMin = -Math.PI;
      limitMax = +Math.PI;
    }

    // Step increments for slider
    const stepSize = (limitMax - limitMin) / 20;

    // Initialize to the position given in URDF file
    const initValue = joint.jointValue;

    // Object to be manipulated
    const jointObject = { [jointName]: initValue };

    // Add slider to GUI
    this._gui.__folders['Robot Joints']
      .add(jointObject, jointName, limitMin, limitMax, stepSize)
      .onChange((newAngle: any) => this.setJointAngle(jointName, newAngle));
  }

  /**
   * Change the background color of the scene
   *
   * @param bgColor - The new background color as RGB array
   */
  setBGColor(bgColor: any[]): void {
    this._viewer.scene.background.r = bgColor[0] / 255;
    this._viewer.scene.background.g = bgColor[1] / 255;
    this._viewer.scene.background.b = bgColor[2] / 255;
  }

  /**
   * Create color controller
   */
  createColorControl(): void {
    const defaultColor = [240, 240, 240];

    // Object to be manipulated
    const colorObject = { Background: defaultColor };

    // Add controller to GUI
    this._gui.__folders['Scene']
      .addColor(colorObject, 'Background')
      .onChange((newColor: any) => this.setBGColor(newColor));
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
    // Inject Amphion
    this._viewer = new Amphion.Viewer3d();
    this._viewer.setContainer(this._host);
  }

  private _resizeWorkspace(): void {
    const rect = this.parent?.node.getBoundingClientRect();
    this._host.style.height = rect?.height + 'px';
  }
}
