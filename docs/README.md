# Building Jupyter-ROS Documentation

1. Clone the repository and create a new environment for development

1. From the root directory, install the extension in editable mode

   ```sh
   pip install -e .[docs]
   ```

1. Build the documents

   ```sh
   cd jupyter-ros/docs/
   make html
   ```

1. Open the documentation locally

   ```sh
   cd _build/html/
   python -m http.server
   ```

1. From a web browser, navigate to `localhost:8000`
