import * as THREE from 'three';
import { URDFRobot, URDFVisual } from 'urdf-loader';

/**
 * Manages the visual representation of links
 */
export class LinkManager {
  private _robot: URDFRobot | null = null;
  private _frameHelpers: THREE.Group;
  private _redrawCallback: () => void;
  private _linkToMeshes: Map<string, THREE.Mesh[]> = new Map();
  private _correctLinkMap: Map<string, THREE.Object3D> = new Map();
  private _visibleFrames: Map<string, number> = new Map();

  constructor(scene: THREE.Scene, redrawCallback: () => void) {
    this._frameHelpers = new THREE.Group();
    scene.add(this._frameHelpers);
    this._redrawCallback = redrawCallback;
  }

  /**
   * Sets the current robot model, builds a correct map of all links,
   * and then maps those links to their meshes.
   */
  public setRobot(robot: URDFRobot | null): void {
    this._robot = robot;
    this._frameHelpers.clear();
    this._linkToMeshes.clear();
    this._correctLinkMap.clear();

    if (robot) {
      this._buildLinkAndMeshMaps(robot);
      this.updateAllFramePositions();
      this._visibleFrames.forEach((size, linkName) => {
        this.setIndividualFrameVisibility(linkName, true, size);
      });
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
      const link = this._correctLinkMap.get(linkName);

      if (link) {
        const worldPosition = new THREE.Vector3();
        const worldQuaternion = new THREE.Quaternion();
        link.matrixWorld.decompose(
          worldPosition,
          worldQuaternion,
          new THREE.Vector3()
        );
        frameGroup.position.copy(worldPosition);
        frameGroup.quaternion.copy(worldQuaternion);
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

    if (visible) {
      this._visibleFrames.set(linkName, size);
    } else {
      this._visibleFrames.delete(linkName);
    }

    if (!visible || !this._robot) {
      this._redrawCallback();
      return;
    }

    const link = this._correctLinkMap.get(linkName);

    if (link) {
      const axes = this._createCustomAxesHelper(size);
      axes.userData.linkName = linkName;

      const worldPosition = new THREE.Vector3();
      const worldQuaternion = new THREE.Quaternion();
      link.matrixWorld.decompose(
        worldPosition,
        worldQuaternion,
        new THREE.Vector3()
      );

      axes.position.copy(worldPosition);
      axes.quaternion.copy(worldQuaternion);

      this._frameHelpers.add(axes);
    }

    this._redrawCallback();
  }

  /**
   * Sets the opacity of a specific link using our custom mesh mapping.
   */
  public setLinkOpacity(linkName: string, opacity: number): void {
    const meshes = this._linkToMeshes.get(linkName);
    if (!meshes || meshes.length === 0) {
      return;
    }

    meshes.forEach(mesh => {
      const materials = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];

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
    });

    this._redrawCallback();
  }

  /**
   * Retrieves the visual object for a given link name.
   * @param linkName - The name of the link.
   * @returns The THREE.Object3D associated with the link's visual, or null.
   */
  public getLinkObject(linkName: string): THREE.Object3D | null {
    const meshes = this._linkToMeshes.get(linkName);
    // Return the first mesh if it exists, otherwise null.
    return meshes && meshes.length > 0 ? meshes[0] : null;
  }

  /**
   * Disposes of managed resources.
   */
  public dispose(): void {
    this._frameHelpers.clear();
    this._frameHelpers.parent?.remove(this._frameHelpers);
    this._linkToMeshes.clear();
    this._correctLinkMap.clear();
  }

  /**
   * This builds the link and mesh maps by using the
   * URDF's XML structure as the absolute ground truth.
   */
  private _buildLinkAndMeshMaps(robot: URDFRobot): void {
    this._correctLinkMap.clear();
    this._linkToMeshes.clear();

    const rootXml = robot.urdfRobotNode;
    if (!rootXml) {
      return;
    }

    // Step 1: Build a  map from the <link> XML Element to the THREE.URDFVisual object
    const linkXmlToVisualMap = new Map<Element, URDFVisual>();
    robot.traverse(node => {
      if ((node as any).isURDFVisual) {
        const visual = node as URDFVisual;
        const visualXml = visual.urdfNode;
        // The parent of a <visual> tag is its <link> tag.
        if (visualXml && visualXml.parentElement) {
          linkXmlToVisualMap.set(visualXml.parentElement, visual);
        }
      }
    });

    // Step 2: Get all <link> tags from the XML
    const allLinkElements = rootXml.querySelectorAll('link');

    // Step 3: Iterate through the list and populate our maps
    allLinkElements.forEach(linkElement => {
      const linkName = linkElement.getAttribute('name');
      if (!linkName) {
        return;
      }

      const visual = linkXmlToVisualMap.get(linkElement);

      if (visual) {
        const meshes: THREE.Mesh[] = [];
        visual.traverse(child => {
          if (child instanceof THREE.Mesh) {
            meshes.push(child);
          }
        });
        this._linkToMeshes.set(linkName, meshes);

        // Map the transform object.
        if (visual.parent && visual.parent !== robot) {
          // Jointed link: the parent is the distinct URDFLink object
          this._correctLinkMap.set(linkName, visual.parent);
        } else {
          // Jointless link: the visual itself is the best object representing the transform
          this._correctLinkMap.set(linkName, visual);
        }
      } else {
        // This link has no visual component (like 'world')
        this._linkToMeshes.set(linkName, []);
        // The root URDFRobot object itself acts as the 'world' link
        if (linkName === 'world') {
          this._correctLinkMap.set(linkName, robot);
        }
      }
    });

    // Step 4: Clone materials for all found meshes to ensure uniqueness
    for (const meshes of this._linkToMeshes.values()) {
      meshes.forEach(mesh => {
        if (Array.isArray(mesh.material)) {
          mesh.material = mesh.material.map(mat => (mat ? mat.clone() : mat));
        } else if (mesh.material) {
          mesh.material = mesh.material.clone();
        }
      });
    }
  }

  /**
   * Creates a custom axes helper
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
}
