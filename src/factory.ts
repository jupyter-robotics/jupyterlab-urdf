import { 
    ABCWidgetFactory, 
    DocumentRegistry,
    DocumentModel,
} from '@jupyterlab/docregistry';

import { IModelDB } from '@jupyterlab/observables';

import { Contents } from '@jupyterlab/services';

import { UrdfWidget, UrdfPanel } from './widget';

// import { UrdfModel } from './model';

/**
 * A widget factory to create new instances of UrdfWidgets
 */
export class UrdfWidgetFactory extends ABCWidgetFactory<
    UrdfWidget, 
    DocumentModel
> {
    constructor(options: DocumentRegistry.IWidgetFactoryOptions) {
        super(options)
    }

    // Create new UrdfWidget given a context (file info)
    protected createNewWidget(
        context: DocumentRegistry.IContext<DocumentModel>
        ): UrdfWidget {
            return new UrdfWidget({
                context,
                content: new UrdfPanel(context),
            });
        }
}


/**
 * A model factory to create new instances of UrdfModel
 */
export class UrdfModelFactory 
    implements DocumentRegistry.IModelFactory<DocumentModel> {
        // The name of the model
        get name(): string {
            return 'urdf-model';
        }

        // The content type of the file
        get contentType(): Contents.ContentType {
            return 'file';
        }

        // The format of the file
        get fileFormat(): Contents.FileFormat {
            return 'text';
        }

        // The disposed status of the factory
        get isDisposed(): boolean {
            return this._disposed;
        }

        // Dispose model factory
        dispose(): void {
            this._disposed = true;
        }

        // Preferred language given path on file
        preferredLanguage(path: string): string {
            return '';
        }

        /**
         * Create new instance of UrdfModel
         * 
         * @param languagePreference Language
         * @param modelDB Model database
         * @returns The model
         */
        createNew(languagePreference?: string, modelDB?: IModelDB): DocumentModel {
            return new DocumentModel(languagePreference, modelDB);
        }

        private _disposed = false;
    }