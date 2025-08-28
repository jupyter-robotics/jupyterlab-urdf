import * as THREE from 'three';
import { URDFRobot } from 'urdf-loader';

/**
 * Manages the visual representation of links
 */
export class LinkManager {
  private _robot: URDFRobot | null = null;
  private _frameHelpers: THREE.Group;
  private _redrawCallback: () => void;

  constructor(scene: THREE.Scene, redrawCallback: () => void) {
    this._frameHelpers = new THREE.Group();
    scene.add(this._frameHelpers);
    this._redrawCallback = redrawCallback;
  }

  /**
   * Sets the current robot model for the manager to operate on.
   * @param robot The URDFRobot model.
   */
  public setRobot(robot: URDFRobot | null): void {
    this._robot = robot;
    this._frameHelpers.clear();
    if (robot) {
      this.updateAllFramePositions();
    }
  }

  /**
   * Updates positions of all visible frames to match the current robot pose.
   */
  public updateAllFramePositions(): void {
    if (!this._robot) {
      return;
    }

    this._frameHelpers.children.forEach((frameGroup: any) => {
      const linkName = frameGroup.userData.linkName;
      if (linkName) {
        this._robot?.traverse((child: any) => {
          if (child.isURDFLink && child.name === linkName) {
            const worldPosition = new THREE.Vector3();
            const worldQuaternion = new THREE.Quaternion();
            child.matrixWorld.decompose(
              worldPosition,
              worldQuaternion,
              new THREE.Vector3()
            );
            frameGroup.position.copy(worldPosition);
            frameGroup.quaternion.copy(worldQuaternion);
          }
        });
      }
    });
  }

  /**
   * Shows or hides a coordinate frame for a specific link.
   */
  public setIndividualFrameVisibility(
    linkName: string,
    visible: boolean,
    size = 0.3
  ): void {
    const existingFrame = this._frameHelpers.children.find(
      (child: any) => child.userData.linkName === linkName
    );
    if (existingFrame) {
      this._frameHelpers.remove(existingFrame);
    }

    if (!visible || !this._robot) {
      this._redrawCallback();
      return;
    }

    this._robot.traverse((child: any) => {
      if (child.isURDFLink && child.name === linkName) {
        const axes = this._createCustomAxesHelper(size);
        axes.userData.linkName = linkName;

        const worldPosition = new THREE.Vector3();
        const worldQuaternion = new THREE.Quaternion();
        child.matrixWorld.decompose(
          worldPosition,
          worldQuaternion,
          new THREE.Vector3()
        );

        axes.position.copy(worldPosition);
        axes.quaternion.copy(worldQuaternion);

        this._frameHelpers.add(axes);
      }
    });

    this._redrawCallback();
  }

  /**
   * Sets the opacity of a specific link.
   */
  public setLinkOpacity(linkName: string, opacity: number): void {
    if (!this._robot) {
      return;
    }

    this._robot.traverse((child: any) => {
      if (child.isURDFLink && child.name === linkName) {
        child.children.forEach((linkChild: any) => {
          if (!linkChild.isURDFLink) {
            this._setMeshOpacity(linkChild, opacity);
          }
        });
      }
    });

    this._redrawCallback();
  }

  /**
   * Disposes of managed resources.
   */
  public dispose(): void {
    this._frameHelpers.clear();
    this._frameHelpers.parent?.remove(this._frameHelpers);
  }

  /**
   * Creates a custom axes helper.
   */
  private _createCustomAxesHelper(size = 0.3): THREE.Group {
    const axesGroup = new THREE.Group();
    const createArrow = (direction: THREE.Vector3, color: number) => {
      return new THREE.ArrowHelper(
        direction.normalize(),
        new THREE.Vector3(0, 0, 0),
        size,
        color,
        size * 0.2,
        size * 0.1
      );
    };

    const xAxis = createArrow(new THREE.Vector3(1, 0, 0), 0xff0000);
    const yAxis = createArrow(new THREE.Vector3(0, 1, 0), 0x00ff00);
    const zAxis = createArrow(new THREE.Vector3(0, 0, 1), 0x0000ff);

    axesGroup.add(xAxis, yAxis, zAxis);
    return axesGroup;
  }

  /**
   * Helper method to recursively set opacity on meshes within a single link.
   */
  private _setMeshOpacity(object: any, opacity: number): void {
    if (object instanceof THREE.Mesh) {
      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      materials.forEach(material => {
        if (material) {
          if (opacity < 1.0) {
            material.transparent = true;
            material.depthWrite = false;
          } else {
            material.transparent = false;
            material.depthWrite = true;
          }
          material.opacity = opacity;
          material.needsUpdate = true;
        }
      });
    }

    object.children.forEach((child: any) => {
      if (!child.isURDFLink) {
        this._setMeshOpacity(child, opacity);
      }
    });
  }
}
