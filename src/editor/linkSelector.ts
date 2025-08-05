import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { Signal } from '@lumino/signaling';
import { URDFRenderer } from '../renderer';

/**
 * LinkSelector: Handles all user interaction logic for the URDF link selection mode
 */
export class LinkSelector {
  private _renderer: URDFRenderer;
  private _raycaster: THREE.Raycaster;
  private _mouse: THREE.Vector2;
  private _linkSelectorMode = false;

  private _hoveredObj: {
    link: any | null;
    originalMaterial: THREE.Material | THREE.Material[] | null;
    tag: CSS2DObject | null;
  } = { link: null, originalMaterial: null, tag: null };

  private _selectedParentObj: {
    link: any | null;
    originalMaterial: THREE.Material | THREE.Material[] | null;
    tag: CSS2DObject | null;
  } = {
    link: null,
    originalMaterial: null,
    tag: null
  };

  private _selectedChildObj: {
    link: any | null;
    originalMaterial: THREE.Material | THREE.Material[] | null;
    tag: CSS2DObject | null;
  } = {
    link: null,
    originalMaterial: null,
    tag: null
  };

  private _highlightMaterial: THREE.Material;
  private _parentSelectMaterial: THREE.Material;
  private _childSelectMaterial: THREE.Material;

  // Signals for communication with layout
  readonly linkSelected = new Signal<this, any>(this);

  constructor(renderer: URDFRenderer) {
    this._renderer = renderer;
    this._raycaster = new THREE.Raycaster();
    this._mouse = new THREE.Vector2();

    // Create highlight and selection materials
    this._highlightMaterial = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 0.6
    });
    this._parentSelectMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.6
    });
    this._childSelectMaterial = new THREE.MeshBasicMaterial({
      color: 0x0000ff,
      transparent: true,
      opacity: 0.6
    });

    this._setupInteractions();
  }

  /**
   * Sets the link selector mode on/off
   */
  setLinkSelectorMode(enabled: boolean): void {
    this._linkSelectorMode = enabled;

    if (!enabled) {
      this.clearHighlights();
    }
  }

  /**
   * Sets up mouse event listeners for picking and hovering
   */
  private _setupInteractions(): void {
    this._setupPicking();
    this._setupHovering();
  }

  /**
   * Sets up mouse click event for selecting links
   */
  private _setupPicking(): void {
    this._renderer.domElement.addEventListener('click', (event: MouseEvent) => {
      if (!this._linkSelectorMode) {
        return;
      }

      const rect = this._renderer.domElement.getBoundingClientRect();
      this._mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this._mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      this._raycaster.setFromCamera(this._mouse, this._renderer.camera);

      const robot = this._renderer.getRobot();
      if (robot) {
        const intersects = this._raycaster.intersectObject(robot, true);
        if (intersects.length > 0) {
          this.linkSelected.emit(intersects[0].object);
        }
      }
    });
  }

  /**
   * Sets up mouse hover event for highlighting links
   */
  private _setupHovering(): void {
    this._renderer.domElement.addEventListener(
      'mousemove',
      (event: MouseEvent) => {
        if (!this._linkSelectorMode) {
          return;
        }

        const rect = this._renderer.domElement.getBoundingClientRect();
        this._mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this._mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this._raycaster.setFromCamera(this._mouse, this._renderer.camera);

        const robot = this._renderer.getRobot();
        if (robot) {
          if (this._hoveredObj.link) {
            if (
              this._hoveredObj.link !== this._selectedParentObj.link &&
              this._hoveredObj.link !== this._selectedChildObj.link
            ) {
              this._hoveredObj.link.material =
                this._hoveredObj.originalMaterial;
            }
            if (this._hoveredObj.tag) {
              this._hoveredObj.link.remove(this._hoveredObj.tag);
            }
            this._hoveredObj = {
              link: null,
              originalMaterial: null,
              tag: null
            };
            this._renderer.redraw();
          }

          const intersects = this._raycaster.intersectObject(robot, true);
          if (intersects.length > 0) {
            const hoveredObject = intersects[0].object as any;

            // Don't highlight already selected links
            if (
              hoveredObject === this._selectedParentObj.link ||
              hoveredObject === this._selectedChildObj.link
            ) {
              return;
            }

            this._hoveredObj.link = hoveredObject;
            this._hoveredObj.originalMaterial = hoveredObject.material;
            hoveredObject.material = this._highlightMaterial;

            // Find the link name by traversing up the hierarchy
            let visual: any = hoveredObject;
            while (visual && !visual.isURDFVisual) {
              visual = visual.parent;
            }

            // Add a tag with the link's name
            if (visual && visual.urdfNode?.parentElement) {
              const linkName =
                visual.urdfNode.parentElement.getAttribute('name');
              const tagDiv = document.createElement('div');
              tagDiv.className = 'jp-urdf-label';
              tagDiv.textContent = linkName;

              const tag = new CSS2DObject(tagDiv);
              this._hoveredObj.tag = tag;
              hoveredObject.add(tag);
            }

            this._renderer.redraw();
          }
        }
      }
    );
  }

  /**
   * Highlights a link with the specified material
   */
  highlightLink(link: any, type: 'parent' | 'child'): void {
    const material =
      type === 'parent'
        ? this._parentSelectMaterial
        : this._childSelectMaterial;
    const selectedObj =
      type === 'parent' ? this._selectedParentObj : this._selectedChildObj;

    // Clear previous selection of the same type
    if (selectedObj.link) {
      selectedObj.link.material = selectedObj.originalMaterial;
      if (selectedObj.tag) {
        selectedObj.link.remove(selectedObj.tag);
      }
    }

    // Apply new highlight
    // The true original material is the one stored on hover.
    selectedObj.originalMaterial =
      link === this._hoveredObj.link
        ? this._hoveredObj.originalMaterial
        : link.material;
    link.material = material;
    selectedObj.link = link;

    this._renderer.redraw();
  }

  /**
   * Un-highlights a single selected link.
   */
  unHighlightLink(type: 'parent' | 'child'): void {
    const selectedObj =
      type === 'parent' ? this._selectedParentObj : this._selectedChildObj;

    if (selectedObj.link) {
      selectedObj.link.material = selectedObj.originalMaterial;
      if (selectedObj.tag) {
        selectedObj.link.remove(selectedObj.tag);
      }
      selectedObj.link = null;
      selectedObj.originalMaterial = null;
      selectedObj.tag = null;
    }
    this._renderer.redraw();
  }

  /**
   * Clears all highlights and tags from selected links.
   */
  clearHighlights(): void {
    if (this._selectedParentObj.link) {
      this._selectedParentObj.link.material =
        this._selectedParentObj.originalMaterial;
      if (this._selectedParentObj.tag) {
        this._selectedParentObj.link.remove(this._selectedParentObj.tag);
      }
      this._selectedParentObj = {
        link: null,
        originalMaterial: null,
        tag: null
      };
    }
    if (this._selectedChildObj.link) {
      this._selectedChildObj.link.material =
        this._selectedChildObj.originalMaterial;
      if (this._selectedChildObj.tag) {
        this._selectedChildObj.link.remove(this._selectedChildObj.tag);
      }
      this._selectedChildObj = {
        link: null,
        originalMaterial: null,
        tag: null
      };
    }
    this._renderer.redraw();
  }
}
