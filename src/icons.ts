import { LabIcon } from '@jupyterlab/ui-components';

import urdf_logo from '/style/icons/urdf_logo.svg';

/**
 * Creates an icon for the URDF extension from a custom SVG
 */
export const urdf_icon = new LabIcon({
  name: 'urdf:icon/logo',
  svgstr: urdf_logo
});
