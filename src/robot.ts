import URDFLoader, { URDFRobot } from 'urdf-loader';
import { XacroLoader } from 'xacro-parser';
import { PageConfig } from '@jupyterlab/coreutils';
import { LoadingManager } from 'three';

/**
 *   THREE.js          ROS URDF
 *      Y                Z
 *      |                |   Y
 *      |                | ／
 *      .-----X          .-----X
 *    ／
 *   Z
 */

class XacroLoaderWithPath extends XacroLoader {
  workingPath = '';

  constructor() {
    super();
  }
}

export class URDFLoadingManager extends LoadingManager {
  private _urdfLoader: URDFLoader;
  private _xacroLoader: XacroLoaderWithPath;
  private _workingPath = '';
  private _robotString = '';
  private _robotModel = {} as URDFRobot;
  private _isReady = false;

  constructor() {
    super();
    this._urdfLoader = new URDFLoader(this);
    this._xacroLoader = new XacroLoaderWithPath();
  }

  setWorkingPath(workingPath: string): void {
    // To match '/this/format/path'
    workingPath = workingPath[0] !== '/' ? '/' + workingPath : workingPath;
    workingPath =
      workingPath[workingPath.length - 1] === '/'
        ? workingPath.slice(0, -1)
        : workingPath;

    console.debug('[Manager]: Modify URL with prefix ', workingPath);
    this._workingPath = workingPath;

    this.setURLModifier((url: string) => {
      if (url.startsWith(this._workingPath)) {
        console.debug('[Loader]:', url);
        return '/files' + url;
      } else {
        const modifiedURL = '/files' + this._workingPath + url;
        console.debug('[Loader]:', modifiedURL);
        return modifiedURL;
      }
    });

    this._xacroLoader.workingPath =
      PageConfig.getBaseUrl() + '/files' + this._workingPath;
  }

  setRobot(robotString = ''): void {
    this._robotString = robotString || this._robotString;

    if (robotString.includes('xacro')) {
      this._xacroLoader.parse(
        this._robotString,
        (xml: XMLDocument) => {
          this._robotModel = this._urdfLoader.parse(xml);
          this._robotModel.rotation.x = -Math.PI / 2;
        },
        (err: Error) => console.error(err)
      );
    } else {
      this._robotModel = this._urdfLoader.parse(this._robotString);
      this._robotModel.rotation.x = -Math.PI / 2;
    }
  }

  get robotModel() {
    return this._robotModel;
  }

  get workingPath() {
    return this._workingPath;
  }

  get isReady() {
    this._isReady = !(Object.keys(this._robotModel).length === 0);
    return this._isReady;
  }
}
