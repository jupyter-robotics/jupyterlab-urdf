import { GUI } from "dat.gui";

interface Joints {
    [name: string]: {
        limit: {
            lower: number,
            upper: number
        },
        jointType: string,
        jointValue: Array<1>
    }
}

export class URDFControls extends GUI {

    private _workspaceFolder: any;
    private _sceneFolder: any;
    private _jointsFolder: any;
    private _workingPath: string = '';

    controls: any = {
        path: {},
        scene: {
            background: {},
            grid: {},
            height: {}
        },
        joints: {}
    };

    constructor() {
        super({autoPlace: false});

        this.width = 310;
        this.domElement.style.position = 'absolute';
        this.domElement.style.top = '0';
        this.domElement.style.right = '0';

        this._workspaceFolder = this.addFolder('Workspace');
        this._sceneFolder = this.addFolder('Scene');
        this._jointsFolder = this.addFolder('Joints');
    }

    get workspaceFolder() {
        return this._workspaceFolder;
    }

    get sceneFolder() {
        return this._sceneFolder;
    }

    get jointsFolder() {
        return this._jointsFolder;
    }

    createWorkspaceControls(workingPath: string) {
        if (!workingPath) {
            return;
        }

        this._workingPath = workingPath;
        const workspaceSettings = {
            'Path': this._workingPath,
            'set path': () => {}
        }
        this._workspaceFolder.add(workspaceSettings, 'Path');
        this.controls.path = this._workspaceFolder.add(workspaceSettings, 'set path');
        this._workspaceFolder.open();
        return this.controls.path;
    }

    createSceneControls(
        bgColor = [38, 50, 56], 
        gridColor = [54, 66, 72]
    ) {
        const sceneSettings = {
            'Background': bgColor,
            'Grid': gridColor,
            'Height': 0
        };

        this.controls.scene.background = this._sceneFolder.addColor(sceneSettings, 'Background');
        this.controls.scene.grid = this._sceneFolder.addColor(sceneSettings, 'Grid');

        const minHeight = -2;
        const maxHeight = 5;
        const stepSize = 0.1;
        this.controls.scene.height = this._sceneFolder.add(
            sceneSettings, 'Height', minHeight, maxHeight, stepSize);

        this._sceneFolder.open();
        return this.controls.scene;
    }

    createJointControls(joints: Joints) {
        Object.keys(joints).forEach((name: string) => {
            // Skip joints which should not be moved
            if (joints[name].jointType === 'fixed') {
                return;
            }

            const limitMin = joints[name].limit.lower;
            const limitMax = joints[name].limit.upper;

            // Skip joint if the limits are not defined
            if ( limitMin === 0 &&  limitMax === 0 ) {
                return;
            }

            const stepSize = ( limitMax - limitMin ) / 20;
            const initValue = joints[name].jointValue[0];

            this.controls.joints[name] = this._jointsFolder.add(
                {[name]: initValue}, name, limitMin, limitMax, stepSize);
        });
        this._jointsFolder.open();
        return this.controls.joints;
    }
}
