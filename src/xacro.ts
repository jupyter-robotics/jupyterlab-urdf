import { RobotModel } from 'amphion';
import { Object3D } from 'three';
// import { Ros } from 'roslib';

class URDFModel extends RobotModel<Object3D> {
    constructor(
        ros: any, // Ros
        paramName: string,
    ) {
        super(ros, paramName);
    }

    loadXACRO(xacroString: string, onComplete = this.onComplete, options: any) {
        const urdfObject = super.parse(xacroString, {
            packages: options.packages || this.packages,
            loadMeshCb: options.loadMeshCb || this.defaultLoadMeshCallback,
            fetchOptions: { mode: 'cors', credentials: 'same-origin' },
            ...options,
        });
        // assertIsDefined(this.object);
        this.urdfObject = urdfObject;
        this.object.add(urdfObject);
        this.object.name = urdfObject.robotName;
    
        onComplete(this.object);
    }

}

export default URDFModel;
