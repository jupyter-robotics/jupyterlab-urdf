import { Message } from '@lumino/messaging';
import { PanelLayout, Widget } from '@lumino/widgets';
import { ArrayIterator, IIterator } from '@lumino/algorithm';

import ROSLIB from '@robostack/roslib';
import Amphion from '@robostack/amphion';
import { DefaultLoadingManager } from 'three';

// Modify URLs for the RobotModel:
//https://github.com/RoboStack/amphion/blob/879045327e879d0bb6fe2c8eac54664de46ef675/src/core/urdf.ts#L22
DefaultLoadingManager.setURLModifier(url => {
  console.debug("THREE MANAGER:", url);
  return '/ros/pkgs' + url;
});

/**
 * A URDF layout to host the URDF viewer
 */
export class URDFLayout extends PanelLayout {
  private _host: HTMLElement;
  private _viewer: any;
  private _robotModel: any = null;

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
    //console.debug("Data:", data);
    const ros = new ROSLIB.Ros();
    //ros.connect("ws://localhost:9090");

    

    // Load robot model
    if (this._robotModel == null) {
      console.log('Robot is null');
    } else {
      console.log('NOT NULL');
      // Robot is the first child of the group
      // const oldRobot = this._viewer.scene.getObjectByName(
      //   this._robotModel.object.name
      //   );
      // oldRobot.parent.remove( oldRobot );
      this._robotModel.object.parent.remove( this._robotModel.object );


      // this._viewer.scene.children[0].remove(this._robotModel.object);
    }
    
    // const robotModel = new Amphion.RobotModel(ros, 'robot_description');
    
    // https://github.com/RoboStack/amphion/blob/879045327e879d0bb6fe2c8eac54664de46ef675/src/core/urdf.ts#L46
    // robotModel.loadURDF(data, robotModel.onComplete, {});
    this._robotModel = new Amphion.RobotModel(ros, 'robot_description');
    this._robotModel.loadURDF(data, this._robotModel.onComplete, {});

    this._robotModel.object.getObjectByName('base_to_shoulder_joint').setAngle(2);

    // window['robot'] = this._robotModel;

    this._viewer.addVisualization(this._robotModel);

    console.log(this._robotModel);
  

  }

  /**
   * Handle `update-request` messages sent to the widget.
   */
  protected onUpdateRequest(msg: Message): void {
    this._resizeWorkspace();
  }

  /**
   * Handle `resize-request` messages sent to the widget.
   */
  protected onResize(msg: Message): void {
    this._resizeWorkspace();
  }

  /**
   * Handle `fit-request` messages sent to the widget.
   */
  protected onFitRequest(msg: Message): void {
    this._resizeWorkspace();
  }

  /**
   * Handle `after-attach` messages sent to the widget.
   */
  protected onAfterAttach(msg: Message): void {
    //inject URDF viewer with appropiate JupyterLab theme.
    //inject Amphion.
    this._viewer = new Amphion.Viewer3d();
    this._viewer.setContainer(this._host);
  }

  private _resizeWorkspace(): void {
    //Resize logic.
    const rect = this.parent?.node.getBoundingClientRect();
    this._host.style.height = rect?.height + 'px';
  }
}
