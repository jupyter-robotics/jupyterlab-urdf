import { 
    DocumentRegistry, 
    DocumentWidget,
    DocumentModel,
} from '@jupyterlab/docregistry';

import { Widget } from '@lumino/widgets';

import { Message } from '@lumino/messaging';

import { Signal } from '@lumino/signaling';

// import robot from 'src/robot.urdf';

import {
    WebGLRenderer,
    PerspectiveCamera,
    Scene,
    Mesh,
    PlaneBufferGeometry,
    ShadowMaterial,
    DirectionalLight,
    PCFSoftShadowMap,
    sRGBEncoding,
    Color,
    AmbientLight,
    Box3,
    LoadingManager,
    MathUtils,
    // Loader,
} from 'three';

import URDFLoader from "urdf-loader"



// import { UrdfModel, UrdfChange, Position } from './model';

/**
 * UrdfWidget: widget that represents the view for a urdf (file).
 */
export class UrdfWidget extends DocumentWidget<UrdfPanel, DocumentModel> {
    constructor(options: DocumentWidget.IOptions<UrdfPanel, DocumentModel>) {
        super(options);        
    }

    // Dispose of resources held by the widget
    dispose(): void {
        this.content.dispose();
        super.dispose();
    }
}

/**
 * UrdfPanel: widget that contains the main view of the UrdfWidget.
 */
export class UrdfPanel extends Widget {
    /**
     * Construct a UrdfPanel
     * 
     * @param context - The documents context
     */
    constructor(context: DocumentRegistry.IContext<DocumentModel>) {
        super();
        this.id = 'canvasP';
        this.addClass('jp-urdf-canvas');  // for css styling
        this._context = context;
        // this._isDown = false;
        // this._offset = { x: 0, y: 0};
        

        this._context.ready.then((value) => {
            // TODO
            this.update();
        });

    

        // TODO
        // const obj = this._context.model.getSharedObject();
        this._canvas = document.createElement('div');
        this._canvas.className = 'jp-urdf-canvas';
        this._canvas.style.left = '0px';
        this._canvas.innerText = 'URDF ROBOT';
        // this.node.appendChild(this._canvas);

        // URDF Loader
        this._scene = new Scene();
        this._scene.background = new Color(0x263238);

        this._camera = new PerspectiveCamera();
        this._camera.position.set(10, 10, 10);
        this._camera.lookAt(0, 0, 0);

        this._renderer = new WebGLRenderer({ antialias: true });
        this._renderer.outputEncoding = sRGBEncoding;
        this._renderer.shadowMap.enable = true;
        this._renderer.shadowMap.type = PCFSoftShadowMap;

        const directionalLight = new DirectionalLight(0xffffff, 1.0);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.setScalar(1024);
        directionalLight.position.set(5, 30, 5);
        this._scene.add(directionalLight);

        const ambientLight = new AmbientLight(0xffffff, 0.2);
        this._scene.add(ambientLight);

        const ground = new Mesh(new PlaneBufferGeometry(), 
                                new ShadowMaterial({ opacity: 0.25}));
        ground.rotation.x = -Math.PI / 2;
        ground.scale.setScalar(30);
        ground.receiveShadow = true;
        this._scene.add(ground);

        // TODO import orbit controls

        // Load Robot
        this._manager = new LoadingManager();
        this._loader = new URDFLoader(this._manager);
         
        // this._loader.load(context.path, (result: any) => {
        //     this._robot = result;
        // });
        
        this._robot = this._loader.parse(context.model.value.text);


        // Wait until all geometry has been loaded to add model to scene
        this._manager.onLoad = () => {
            this._robot.rotation.x = Math.PI / 2;
            this._robot.traverse((c : any) => {
                c.castShadow = true;
            });
            for (let i = 1; i <=6; i++) {
                this._robot.joints[`HP${ i }`].setJointValue(MathUtils.degToRad(30));
                this._robot.joints[`KP${ i }`].setJointValue(MathUtils.degToRad(120));
                this._robot.joints[`AP${ i }`].setJointValue(MathUtils.degToRad(-60));
            }
            this._robot.updateMatrixWorld(true);

            const bb = new Box3();
            bb.setFromObject(this._robot);

            this._robot.position.y -= bb.min.y;
            this._scene.add(this._robot);
        };

        // TODO add onResize() 
        
        this._renderer.render(this._scene, this._camera);

        this.node.appendChild(this._renderer.domElement);
        

    }

    // Dispose of resources held by widget
    dispose(): void {
        if (this.isDisposed) {
            return;
        }
        Signal.clearData(this);
        super.dispose();
    }

    /**
     * Handle after-attach messages sent to widget
     * 
     * @param msg - Widget layout message
     */
    protected onAfterAttach(msg: Message): void {
        super.onAfterAttach(msg);
        // this._cube.addEventListener('mousedown', this, true);
        // TODO
    }

    /**
     * Handle before-detach messages sent to widget
     * 
     * @param msg - Widget layout message
     */
    protected onBeforeDetach(msg: Message): void {
        super.onBeforeDetach(msg);
        // this._cube.removeEventListener('mousedown', this, true);
        // TODO
    }

    /**
     * Handle event messages sent to widget
     * 
     * @param event - Event on the widget
     */
    public handleEvent(event: MouseEvent): void {
        event.preventDefault();
        event.stopPropagation();

        // TODO
    }


    private _context: DocumentRegistry.IContext<DocumentModel>;
    private _canvas: HTMLElement;
    // private _isDown: boolean;
    // private _offset: Position;
    // private _cube: HTMLElement;

    // URDF Loader variables
    private _scene: any;
    private _camera: any;
    private _renderer: any;
    private _robot: any;
    // private _controls: any;
    private _manager: any;
    private _loader: any;
}
