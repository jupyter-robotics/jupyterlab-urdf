# Building JupyterLab-URDF Documentation

1. Clone the repository and create a new environment for development

1. From the root directory, install the dependencies

   ```sh
   jlpm run install:docs
   ```

1. Build the documents

   ```sh
   jlpm run build:docs
   ```

1. Open the documentation locally

   ```sh
   jlpm run serve:docs
   ```

1. From a web browser, navigate to `localhost:8000`
