/**
 * A class for manipulating URDF XML documents.
 */
export class UrdfEditor {
  private _parser = new DOMParser();
  private _serializer = new XMLSerializer();

  /**
   * Adds a new joint to a URDF string.
   *
   * @param urdfString - The URDF string to modify.
   * @param joint - The joint to add.
   * @returns The modified URDF string.
   */
  addJoint(
    urdfString: string,
    joint: {
      name: string;
      type: string;
      parent: string;
      child: string;
    }
  ): string {
    const urdf = this._parser.parseFromString(urdfString, 'application/xml');
    const robot = urdf.getElementsByTagName('robot')[0];

    if (!robot) {
      throw new Error('No robot tag found in URDF');
    }

    const jointElement = urdf.createElement('joint');
    jointElement.setAttribute('name', joint.name);
    jointElement.setAttribute('type', joint.type);

    const parentElement = urdf.createElement('parent');
    parentElement.setAttribute('link', joint.parent);
    jointElement.appendChild(parentElement);

    const childElement = urdf.createElement('child');
    childElement.setAttribute('link', joint.child);
    jointElement.appendChild(childElement);

    const originElement = urdf.createElement('origin');
    originElement.setAttribute('xyz', '0 0 0');
    originElement.setAttribute('rpy', '0 0 0');
    jointElement.appendChild(originElement);

    const axisElement = urdf.createElement('axis');
    axisElement.setAttribute('xyz', '0 0 1');
    jointElement.appendChild(axisElement);

    robot.appendChild(jointElement);

    return this._serializer.serializeToString(urdf);
  }
}
