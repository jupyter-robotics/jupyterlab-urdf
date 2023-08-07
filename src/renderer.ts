import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

export class URDFRenderer extends THREE.WebGLRenderer {
    private _scene: THREE.Scene;
    private _camera: THREE.PerspectiveCamera;
    private _controls: OrbitControls;

    constructor () {
        super({ antialias: true });

        this._scene = new THREE.Scene();
        this._initScene();

        this._camera = new THREE.PerspectiveCamera();
        this._initCamera();

        this._controls = new OrbitControls(this._camera, this.domElement);
        this._initControls();
    }

    private _initScene(): void {
        console.log("TODO:");
        const gridColor = new THREE.Color(0xff0000);
        const grid = new THREE.GridHelper(50, 50, gridColor, gridColor);
        grid.receiveShadow = true;
        this._scene.add(grid);
    }

    private _initCamera(): void {
        console.log("TODO: ");
    }

    private _initControls(): void {
        this._controls.rotateSpeed = 2.0;
        this._controls.zoomSpeed = 5;
        this._controls.panSpeed = 2;
        this._controls.enableZoom = true;
        this._controls.enableDamping = false;
        this._controls.maxDistance = 50;
        this._controls.minDistance = 0.25;
        this._controls.addEventListener('change', () => this.redraw());
    }

    redraw(): void {
        this.render(this._scene, this._camera);
    }
}