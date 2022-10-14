import { XacroParser } from 'xacro-parser';

export class xacro2urdf extends XacroParser{
    public xacroString: string = ""

    constructor(xacroString: string) {
        super();
        this.xacroString = xacroString;
    }
    
}

export default xacro2urdf
