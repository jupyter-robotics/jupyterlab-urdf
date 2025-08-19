/**
 * A class for manipulating URDF XML documents.
 */
export class URDFEditor {
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

  /**
   * Modifies an existing joint in a URDF string.
   *
   * @param urdfString - The URDF string to modify.
   * @param jointName - The name of the joint to modify.
   * @param modifications - Partial joint properties to update.
   * @returns The modified URDF string.
   */
  modifyJoint(
    urdfString: string,
    jointName: string,
    modifications: Partial<{
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
    }>
  ): string {
    const urdf = this._parser.parseFromString(urdfString, 'application/xml');
    const joints = urdf.getElementsByTagName('joint');

    // Find the joint to modify
    let targetJoint: Element | null = null;
    for (let i = 0; i < joints.length; i++) {
      if (joints[i].getAttribute('name') === jointName) {
        targetJoint = joints[i];
        break;
      }
    }

    if (!targetJoint) {
      throw new Error(`Joint "${jointName}" not found in URDF`);
    }

    // Helper to create an indented text node
    const createIndent = (level: number) =>
      urdf.createTextNode(`\n${'  '.repeat(level)}`);

    // Helper to find or create a child element
    const findOrCreateElement = (parent: Element, tagName: string): Element => {
      const existing = parent.getElementsByTagName(tagName)[0];
      if (existing) {
        return existing;
      }

      const newElement = urdf.createElement(tagName);
      parent.appendChild(createIndent(2));
      parent.appendChild(newElement);
      return newElement;
    };

    // Update joint type if specified
    if (modifications.type !== undefined) {
      targetJoint.setAttribute('type', modifications.type);
    }

    // Update parent link if specified
    if (modifications.parent !== undefined) {
      const parentElement = findOrCreateElement(targetJoint, 'parent');
      parentElement.setAttribute('link', modifications.parent);
    }

    // Update child link if specified
    if (modifications.child !== undefined) {
      const childElement = findOrCreateElement(targetJoint, 'child');
      childElement.setAttribute('link', modifications.child);
    }

    // Update origin if specified
    if (
      modifications.origin_xyz !== undefined ||
      modifications.origin_rpy !== undefined
    ) {
      const originElement = findOrCreateElement(targetJoint, 'origin');
      if (modifications.origin_xyz !== undefined) {
        originElement.setAttribute('xyz', modifications.origin_xyz);
      }
      if (modifications.origin_rpy !== undefined) {
        originElement.setAttribute('rpy', modifications.origin_rpy);
      }
    }

    // Get current or updated joint type for conditional elements
    const jointType =
      modifications.type || targetJoint.getAttribute('type') || '';

    // Handle axis element based on joint type
    const axisElement = targetJoint.getElementsByTagName('axis')[0];
    const needsAxis = [
      'revolute',
      'continuous',
      'prismatic',
      'planar'
    ].includes(jointType);

    if (needsAxis) {
      if (modifications.axis_xyz !== undefined) {
        const axis = findOrCreateElement(targetJoint, 'axis');
        axis.setAttribute('xyz', modifications.axis_xyz);
      }
    } else if (axisElement) {
      // Remove axis if joint type doesn't need it
      targetJoint.removeChild(axisElement);
    }

    // Handle limit element based on joint type
    const limitElement = targetJoint.getElementsByTagName('limit')[0];
    const needsLimits = ['revolute', 'prismatic'].includes(jointType);

    if (needsLimits) {
      if (
        modifications.lower !== undefined ||
        modifications.upper !== undefined ||
        modifications.effort !== undefined ||
        modifications.velocity !== undefined
      ) {
        const limit = findOrCreateElement(targetJoint, 'limit');
        if (modifications.lower !== undefined) {
          limit.setAttribute('lower', modifications.lower);
        }
        if (modifications.upper !== undefined) {
          limit.setAttribute('upper', modifications.upper);
        }
        if (modifications.effort !== undefined) {
          limit.setAttribute('effort', modifications.effort);
        }
        if (modifications.velocity !== undefined) {
          limit.setAttribute('velocity', modifications.velocity);
        }
      }
    } else if (limitElement) {
      // Remove limits if joint type doesn't need them
      targetJoint.removeChild(limitElement);
    }

    return this._serializer.serializeToString(urdf);
  }
}
