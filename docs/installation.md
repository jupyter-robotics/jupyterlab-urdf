# Installation

## Requirements

- JupyterLab >= 3.0

For running the examples and interfacing with ROS, the following packages are also required:

- `jupyterlab-ros`
- `ros-noetic-urdf-tutorial`
- `ros-noetic-turtlebot3-description`

These packages can be installed with `conda` from the RoboStack channel.

## Install

To install the extension, execute:

1. `conda install jupyterlab-urdf -c conda-forge` or
2. `pip install jupyterlab-urdf` or
3. `npm i jupyterlab_urdf`

## Uninstall

To remove the extension, execute:

1. `conda remove jupyterlab-urdf` or
2. `pip uninstall jupyterlab-urdf` or
3. `npm uninstall jupyterlab_urdf`

## Development install

**Note:** You will need NodeJS to build the extension package.

The `jlpm` command is JupyterLab's pinned version of
[yarn](https://yarnpkg.com/) that is installed with JupyterLab. You may use
`yarn` or `npm` in lieu of `jlpm` below.

```bash
# Clone the repo to your local environment
# Change directory to the jupyterlab_urdf directory
# Install package in development mode
pip install -e .
# Link your development version of the extension with JupyterLab
jupyter labextension develop . --overwrite
# Rebuild extension Typescript source after making changes
jlpm build
```

You can watch the source directory and run JupyterLab at the same time in different terminals to watch for changes in the extension's source and automatically rebuild the extension.

```bash
# Watch the source directory in one terminal, automatically rebuilding when needed
jlpm watch
# Run JupyterLab in another terminal
jupyter lab
```

With the watch command running, every saved change will immediately be built locally and available in your running JupyterLab. Refresh JupyterLab to load the change in your browser (you may need to wait several seconds for the extension to be rebuilt).

By default, the `jlpm build` command generates the source maps for this extension to make it easier to debug using the browser dev tools. To also generate source maps for the JupyterLab core extensions, you can run the following command:

```bash
jupyter lab build --minimize=False
```

## Development uninstall

```bash
pip uninstall jupyterlab_urdf
```

In development mode, you will also need to remove the symlink created by `jupyter labextension develop`
command. To find its location, you can run `jupyter labextension list` to figure out where the `labextensions`
folder is located. Then you can remove the symlink named `jupyterlab_urdf` within that folder.
