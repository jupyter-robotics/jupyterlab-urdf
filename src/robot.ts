import URDFLoader, { URDFRobot } from 'urdf-loader';

import { XacroLoader } from 'xacro-parser';

import { PageConfig } from '@jupyterlab/coreutils';

import {
  Group,
  LoadingManager,
  Mesh,
  MeshPhongMaterial,
  Object3D
} from 'three';

import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { ColladaLoader } from 'three/examples/jsm/loaders/ColladaLoader';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader';

import type { Contents } from '@jupyterlab/services';

import { decodeBase64ToUtf8, base64ToBytes } from './utils';

/**
 * Contents manager used to fetch mesh files directly from the Jupyter
 * contents API instead of over HTTP.
 */
let contentsManager: Contents.IManager | null = null;

export function setContentsManager(manager: Contents.IManager): void {
  contentsManager = manager;
}

/**
 *   THREE.js          ROS URDF
 *      Y                Z
 *      |                |   Y
 *      |                | ／
 *      .-----X          .-----X
 *    ／
 *   Z
 */

/**
 * XacroLoaderWithPath: a XacroLoader with a workingPath property
 *
 * Note: XacroLoader already has a workingPath property because it is derived
 * from XacroParser, but it is not possible to modify directly. Thus,
 * workingPath is overwritten with this class.
 */
class XacroLoaderWithPath extends XacroLoader {
  workingPath = '';

  constructor() {
    super();
  }
}

/**
 * URDFLoadingManager: a loading manager for URDF files
 */
export class URDFLoadingManager extends LoadingManager {
  private _urdfLoader: URDFLoader;
  private _xacroLoader: XacroLoaderWithPath;
  private _workingPath = '';
  private _robotString = '';
  private _robotModel = {} as URDFRobot;
  private _isReady = false;

  /**
   * Creates the manager and initializes the URDF and XACRO loaders
   */
  constructor() {
    super();
    this._urdfLoader = new URDFLoader(this);
    this._xacroLoader = new XacroLoaderWithPath();
    // Override the default mesh loader to support .obj files
    (this._urdfLoader as any).loadMeshCb = this._meshLoader.bind(this);

    this.setWorkingPath();
  }

  /**
   * Custom mesh loading function to support .stl, .dae, and .obj files
   *
   * @param path - The path to the mesh file
   * @param manager - The loading manager
   * @param done - The callback function to be called when the mesh is loaded
   */
  private _meshLoader(
    path: string,
    manager: LoadingManager,
    done: (mesh: Object3D) => void
  ): void {
    if (/\.stl$/i.test(path)) {
      this._loadMeshBytes(path).then(data => {
        const geom = new STLLoader(manager).parse(data);
        done(new Mesh(geom, new MeshPhongMaterial()));
      });
    } else if (/\.dae$/i.test(path)) {
      this._loadMeshText(path).then(text => {
        done(new ColladaLoader(manager).parse(text, path).scene);
      });
    } else if (/\.obj$/i.test(path)) {
      const mtlPath = path.replace(/\.obj$/i, '.mtl');

      const loadObj = (materials?: any) => {
        this._loadMeshText(path).then(text => {
          const objLoader = new OBJLoader(manager);
          if (materials) {
            objLoader.setMaterials(materials);
          }
          const obj = objLoader.parse(text);
          const wrapper = new Group();
          wrapper.add(obj);
          this._applyMaterialSetter(wrapper);
          done(wrapper);
        });
      };

      this._loadMeshText(mtlPath)
        .then(text => {
          const materials = new MTLLoader(manager).parse(text, mtlPath);
          materials.preload();
          loadObj(materials);
        })
        .catch(() => loadObj());
    } else {
      console.warn(
        `URDFLoader: Could not load model at ${path}.\nNo loader available`
      );
    }
  }

  /**
   * Fetches a mesh file through the Jupyter contents API.
   */
  private _getMeshModel(path: string): Promise<Contents.IModel> {
    if (!contentsManager) {
      return Promise.reject(new Error('No contents manager registered'));
    }
    return contentsManager.get(path.replace(/^\/+/, ''), { content: true });
  }

  private _loadMeshText(path: string): Promise<string> {
    return this._getMeshModel(path).then(model =>
      model.format === 'base64'
        ? decodeBase64ToUtf8(model.content)
        : model.content
    );
  }

  private _loadMeshBytes(path: string): Promise<ArrayBuffer> {
    return this._getMeshModel(path).then(model =>
      model.format === 'base64'
        ? (base64ToBytes(model.content).buffer as ArrayBuffer)
        : (new TextEncoder().encode(model.content).buffer as ArrayBuffer)
    );
  }

  /**
   * Adds a virtual 'material' property to a `THREE.Object3D` (typically a Group)
   * This is for obj files with mtl files
   *
   * @param obj - The object (Group or Mesh) to apply the material propagation to.
   */
  private _applyMaterialSetter(obj: Object3D): void {
    Object.defineProperty(obj, 'material', {
      get: function () {
        return null;
      },
      set: function (material) {
        obj.traverse(child => {
          if ((child as Mesh).isMesh) {
            (child as Mesh).material = material;
          }
        });
      },
      configurable: true
    });
  }

  /**
   * Sets the path where the loaders will search for robot description files
   *
   * @param workingPath - The path to the robot files
   */
  setWorkingPath(workingPath = ''): void {
    // To match '/this/format/path'
    workingPath = workingPath[0] !== '/' ? '/' + workingPath : workingPath;
    workingPath =
      workingPath[workingPath.length - 1] === '/'
        ? workingPath.slice(0, -1)
        : workingPath;

    console.debug('[Manager]: Modify URL with prefix ', workingPath);
    this._workingPath = workingPath;

    this.setURLModifier((url: string) => {
      const baseUrl = PageConfig.getBaseUrl();
      if (url.startsWith(this._workingPath)) {
        console.debug('[Loader]:', url);
        return baseUrl + 'files' + url;
      } else {
        const normalizedUrl = url.startsWith('/') ? url.slice(1) : url;
        const modifiedURL = '/files' + this._workingPath + '/' + normalizedUrl;
        console.debug('[Loader]:', modifiedURL);
        return modifiedURL;
      }
    });

    this._xacroLoader.workingPath =
      PageConfig.getBaseUrl() + 'files' + this._workingPath + '/';
    console.debug(
      '[Xacro]: Modify URL with prefix',
      this._xacroLoader.workingPath
    );
  }

  /**
   * Creates a robot model from a given URDF
   *
   * @param robotString - The robot description in the URDF file
   */
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

  /**
   * Resets the robot model
   */
  dispose(): void {
    this._robotModel = {} as URDFRobot;
  }

  /**
   * Retrieves the robot model
   */
  get robotModel() {
    return this._robotModel;
  }

  /**
   * Retrieves the working path
   */
  get workingPath() {
    return this._workingPath;
  }

  /**
   * Checks if the robot model has finished loading
   */
  get isReady() {
    this._isReady = !(Object.keys(this._robotModel).length === 0);
    return this._isReady;
  }
}
