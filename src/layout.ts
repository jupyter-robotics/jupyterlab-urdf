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
  return '/api/pkgs' + url;
});

/**
 * A blockly layout to host the Blockly editor.
 */
export class URDFLayout extends PanelLayout {
  private _host: HTMLElement;
  private _viewer: any;

  /**
   * Construct a `URDFLayout`.
   *
   */
  constructor() {
    super();

    // Creating the container for the Blockly editor
    // and the output area to render the execution replies.
    this._host = document.createElement('div');
  }

  /**
   * Dispose of the resources held by the widget.
   */
  dispose(): void {
    this._viewer.destroy();
    super.dispose();
  }

  /**
   * Init the blockly layout
   */
  init(): void {
    super.init();
    // Add the blockly container into the DOM
    this.addWidget(new Widget({ node: this._host }));
  }

  /**
   * Create an iterator over the widgets in the layout.
   */
  iter(): IIterator<Widget> {
    return new ArrayIterator([]);
  }

  /**
   * Remove a widget from the layout.
   *
   * @param widget - The `widget` to remove.
   */
  removeWidget(widget: Widget): void {
    return;
  }

  setURDF(data: string): void {
    //console.debug("Data:", data);
    const ros = new ROSLIB.Ros();
    //ros.connect("ws://localhost:9090");

    // Load robot model
    const robotModel = new Amphion.RobotModel(ros, 'robot_description');
    
    // https://github.com/RoboStack/amphion/blob/879045327e879d0bb6fe2c8eac54664de46ef675/src/core/urdf.ts#L46
    robotModel.loadURDF(data, robotModel.onComplete, {});
    this._viewer.addVisualization(robotModel);
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
    //inject Blockly with appropiate JupyterLab theme.
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
