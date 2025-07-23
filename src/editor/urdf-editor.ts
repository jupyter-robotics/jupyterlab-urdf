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
      origin_xyz: string;
      origin_rpy: string;
      axis_xyz: string;
      lower: string;
      upper: string;
      effort: string;
      velocity: string;
    }
  ): string {
    const urdf = this._parser.parseFromString(urdfString, 'application/xml');
    const robot = urdf.getElementsByTagName('robot')[0];

    if (!robot) {
      throw new Error('No robot tag found in URDF');
    }

    // Helper to create an indented text node
    const createIndent = (level: number) =>
      urdf.createTextNode(`\n${'  '.repeat(level)}`);

    const jointElement = urdf.createElement('joint');
    jointElement.setAttribute('name', joint.name);
    jointElement.setAttribute('type', joint.type);

    // Add child elements with indentation
    jointElement.appendChild(createIndent(2));
    const parentElement = urdf.createElement('parent');
    parentElement.setAttribute('link', joint.parent);
    jointElement.appendChild(parentElement);

    jointElement.appendChild(createIndent(2));
    const childElement = urdf.createElement('child');
    childElement.setAttribute('link', joint.child);
    jointElement.appendChild(childElement);

    jointElement.appendChild(createIndent(2));
    const originElement = urdf.createElement('origin');
    originElement.setAttribute('xyz', joint.origin_xyz);
    originElement.setAttribute('rpy', joint.origin_rpy);
    jointElement.appendChild(originElement);

    // Add axis only for relevant joint types
    if (
      joint.type === 'revolute' ||
      joint.type === 'continuous' ||
      joint.type === 'prismatic' ||
      joint.type === 'planar'
    ) {
      jointElement.appendChild(createIndent(2));
      const axisElement = urdf.createElement('axis');
      axisElement.setAttribute('xyz', joint.axis_xyz);
      jointElement.appendChild(axisElement);
    }

    // Add limit only for relevant joint types
    if (joint.type === 'revolute' || joint.type === 'prismatic') {
      jointElement.appendChild(createIndent(2));
      const limitElement = urdf.createElement('limit');
      limitElement.setAttribute('lower', joint.lower);
      limitElement.setAttribute('upper', joint.upper);
      limitElement.setAttribute('effort', joint.effort);
      limitElement.setAttribute('velocity', joint.velocity);
      jointElement.appendChild(limitElement);
    }

    // Add final indent before closing tag
    jointElement.appendChild(createIndent(1));

    // Append the new joint with proper indentation
    robot.appendChild(createIndent(1));
    robot.appendChild(jointElement);
    robot.appendChild(createIndent(0));

    return this._serializer.serializeToString(urdf);
  }
}
