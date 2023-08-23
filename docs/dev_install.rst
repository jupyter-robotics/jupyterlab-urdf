Development
===========

Install
-------

**Requirements**

* JupyterLab \>= 4.0

The ``jlpm`` command is JupyterLab's pinned version of
`yarn <https://yarnpkg.com/>`_ that is installed with JupyterLab. You may use
``yarn`` or ``npm`` in lieu of ``jlpm`` below.

1. Copy the repo to your local environment

  .. code-block:: bash

    git clone git@github.com:jupyter-robotics/jupyterlab-urdf.git
    cd jupyterlab-urdf

2. Install package in editable mode

  .. code-block:: bash

    pip install -e .

3. Link your development version of the extension with JupyterLab

  .. code-block:: bash

    jupyter labextension develop . --overwrite

4. Rebuild extension Typescript source after making changes

  .. code-block:: bash

    jlpm build

5. Launch JupyterLab for testing the extension

  .. code-block:: bash

    jupyter lab


.. note::
  **Troubleshooting**

  If you encounter the following error, install ``yarn=1.21``

  .. highlight:: none
  .. code-block::

    note: This error originates from a subprocess, and is likely not a problem with pip.
    error: metadata-generation-failed

    \× Encountered error while generating package metadata.


You can watch the source directory and run JupyterLab at the same time in 
different terminals to watch for changes in the extension's source and 
automatically rebuild the extension.

.. code-block:: bash

  # Terminal 1
  jlpm watch

.. code-block:: bash

  # Terminal 2
  jupyter lab

With the watch command running, every saved change will immediately be built
locally and available in your running JupyterLab. Refresh JupyterLab to load
the change in your browser (you may need to wait several seconds for the
extension to be rebuilt).

By default, the ``jlpm build`` command generates the source maps for this
extension to make it easier to debug using the browser dev tools. To also
generate source maps for the JupyterLab core extensions, you can run the
following command:

.. code-block:: bash

  jupyter lab build --minimize=False


Uninstall
---------

.. code-block:: bash

  pip uninstall jupyterlab_urdf

In development mode, you will also need to remove the symlink created by
``jupyter labextension develop`` command. To find its location, you can run
``jupyter labextension list`` to figure out where the ``labextensions``
folder is located. Then you can remove the symlink named ``jupyterlab_urdf``
within that folder.
