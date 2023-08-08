import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

/**
 *   THREE.js          ROS URDF
 *      Y                Z
 *      |                |   Y
 *      |                | ／
 *      .-----X          .-----X
 *    ／
 *   Z
 */

export class URDFRenderer extends THREE.WebGLRenderer {
    private _scene: THREE.Scene;
    private _camera: THREE.PerspectiveCamera;
    private _controls: OrbitControls;
    private _colorSky: THREE.Color;
    private _colorGround: THREE.Color;

    constructor (
        colorSky = new THREE.Color(0x263238),
        colorGround = new THREE.Color(0x364248)
    ) {
        super({ antialias: true });

        this._colorSky = colorSky;
        this._colorGround = colorGround;

        this.setClearColor(0xffffff);
        this.setClearAlpha(0);
        this.outputColorSpace = THREE.SRGBColorSpace;
        this.shadowMap.enabled = true;
        this.shadowMap.type = THREE.PCFSoftShadowMap;

        this._scene = new THREE.Scene();
        this._initScene();

        this._camera = new THREE.PerspectiveCamera();
        this._initCamera();

        this._controls = new OrbitControls(this._camera, this.domElement);
        this._initControls();
    }

    private _initCamera(): void {
        this._camera.position.set(4, 4, 4);
        this._camera.lookAt(0, 0, 0);
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

    private _initScene(): void {
        this._scene.background = this._colorSky;
        this._scene.up = new THREE.Vector3(0, 0, 1); // Z is up
        this._addGround();
        this._addGrid();
        this._addLights();        
    }

    private _addGround(): void {
        const ground = new THREE.Mesh(
            new THREE.PlaneGeometry(40, 40),
            new THREE.ShadowMaterial({ opacity: 0.5 })
        );
        ground.rotation.x = -Math.PI / 2;
        ground.scale.setScalar(30);
        ground.receiveShadow = true;
        this._scene.add(ground);
    }

    private _addGrid(): void {
        const grid = new THREE.GridHelper(50, 50, this._colorGround, this._colorGround);
        grid.receiveShadow = true;
        this._scene.add(grid);
    }

    private _addLights(): void {
        const directionalLight = new THREE.DirectionalLight(0xffffff, 2.0);
        directionalLight.castShadow = true;
        directionalLight.position.set(3, 10, 3);
        directionalLight.shadow.camera.top = 2;
        directionalLight.shadow.camera.bottom = -2;
        directionalLight.shadow.camera.left = -2;
        directionalLight.shadow.camera.right = 2;
        directionalLight.shadow.camera.near = 0.1;
        directionalLight.shadow.camera.far = 40;
        this._scene.add(directionalLight);

        const ambientLight = new THREE.AmbientLight('#fff');
        ambientLight.intensity = 0.5;
        ambientLight.position.set(0, 5, 0);
        this._scene.add(ambientLight);

        const hemisphereLight = new THREE.HemisphereLight(this._colorSky, this._colorGround);
        hemisphereLight.intensity = 1;
        this._scene.add(hemisphereLight);
    }

    private _updateLights(): void {
        const hemisphereLight = new THREE.HemisphereLight(this._colorSky, this._colorGround);
        hemisphereLight.intensity = 1;
        const hemisphereIndex = this._scene.children.map( i => i.type )
            .indexOf("HemisphereLight");
        this._scene.children[hemisphereIndex] = hemisphereLight;
    }

    /**
     * Change the background color of the scene
     *
     * @param newColor - The new background color as [R, G, B] array 0-255
     */
    setSkyColor(newColor: number[]): void {
        this._colorSky = new THREE.Color(...newColor.map( x => x / 255 ));
        this._scene.background = this._colorSky;
        this._updateLights();
        this.redraw();
    }

    /**
     * Change the grid color of the ground
     *
     * @param newColor - The new background color as [R, G, B] array 0-255
     */
    setGroundColor(newColor: number[]): void {
        this._colorGround = new THREE.Color(...newColor.map( x => x / 255 ));
        const gridIndex = this._scene.children.map(i => i.type).indexOf("GridHelper");
        this._scene.children[gridIndex] = new THREE.GridHelper(50, 50, this._colorGround, this._colorGround);
        this._updateLights();
        this.redraw();
    }

    setGridHeight(height: number = 0): void {
        const gridIndex = this._scene.children.map(i => i.type).indexOf('GridHelper');
        this._scene.children[gridIndex].position.y = height;
        this.redraw();
    }

    redraw(): void {
        this.render(this._scene, this._camera);
    }
}