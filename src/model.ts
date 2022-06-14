// import { DocumentRegistry } from '@jupyterlab/docregistry';

// import { ISharedDocument } from '@jupyterlab/shared-models';

// import { IModelDB, ModelDB } from '@jupyterlab/observables';

// import { IChangedArgs } from '@jupyterlab/coreutils';

// import { PartialJSONObject } from '@lumino/coreutils';

// import { ISignal, Signal } from '@lumino/signaling';


// /**
//  * UrdfModel: this Model represents the content of the file
//  */
// export class UrdfModel implements DocumentRegistry.IModel {
//     /**
//     * Construct new UrdfModel
//     * 
//     * @param languagePreference Language
//     * @param modelDB Model database
//     */
//     constructor(languagePreference?: string, modelDB?: IModelDB) {
//         this.modelDB = modelDB || new ModelDB();
//     }
//     defaultKernelName: string = '';
//     defaultKernelLanguage: string = '';
//     sharedModel: string = '';

//     /**
//      * Get/set the dirty attribute to know when  
//      * content in document differs from disk
//      * 
//      * @returns dirty attribute
//      */
//     get dirty(): boolean {
//         return this._dirty;
//     }
//     set dirty(value: boolean) {
//         this._dirty = value;
//     }

//     /**
//      * Get/set the readOnly attribute to know when
//      * model is read only or not
//      * 
//      * @returns readOnly attribute
//      */
//     get readOnly(): boolean {
//         return this._readOnly;
//     }
//     set readOnly(value: boolean) {
//         this._readOnly = value;
//     }

//     /**
//      * Get isDisposed attribute to know whether
//      * this model has been disposed or not
//      * 
//      * @returns Model disposed status
//      */
//     get isDisposed(): boolean {
//         return this._isDisposed;
//     }

//     /**
//      * Get the signal contentChange to listen for 
//      * changes on the content (data stored in model)
//      * 
//      * @returns The signal
//      */
//     get contentChanged(): ISignal<this, void> {
//         return this._contentChanged;
//     }

//     /**
//      * Get the signal stateChange to listen for
//      * changes on the state (metadata or attributes of model)
//      * 
//      * @returns The signal
//      */
//     get stateChanged(): ISignal<this, IChangedArgs<any, any, string>> {
//         return this._stateChanged;
//     }

//     /**
//      * Dispose of the resources held by the model
//      */
//     dispose(): void {
//         if (this._isDisposed) {
//             return;
//         }
//         this._isDisposed = true;
//         Signal.clearData(this);
//     }

//     /**
//      * Returns data needed to be stored in disk as string.
//      * The context will call this method to get the file's
//      * content and save it to disk.
//      * 
//      * @returns The data
//      */
//     toString(): any { // string
//         //TODO
//     }

//     /**
//      * The context will call this method when loading data from disk.
//      * This method should implement the logic to parse the data and
//      * store it on the datastore.
//      * 
//      * @returns The serialized data
//      */
//     fromString(value: string): void {
//         //TODO
//     }

//     initialize(): void {
//         // nothing to do? || TODO
//     }

//     // readonly defaultKernelName: string | undefined = '';
//     // readonly defaultKernelLanguage: string | undefined = '';

//     // readonly sharedModel: ISharedDocument;
//     readonly modelDB: IModelDB;

//     private _dirty = false;
//     private _readOnly = false;
//     private _isDisposed = false;
//     private _contentChanged = new Signal<this, void>(this);
//     private _stateChanged = new Signal<this, IChangedArgs<any>>(this);  /**
//     * Should return the data that you need to store in disk as a JSON object.
//     * The context will call this method to get the file's content and save it
//     * to disk.
//     *
//     * NOTE: This method is only used by the context of the notebook, every other
//     * document will load/save the data through toString/fromString.
//     *
//     * @returns Model JSON representation
//     */
//    toJSON(): PartialJSONObject {
//      const pos = '';
//      const obj = {
//        x: 10,
//        y: 10,
//        content: '',
//      };
//      return obj;
//    }
 
//    /**
//     * The context will call this method when loading data from disk.
//     * This method should implement the logic to parse the data and store it
//     * on the datastore.
//     *
//     * NOTE: This method is only used by the context of the notebook, every other
//     * document will load/save the data through toString/fromString.
//     *
//     * @param data Serialized model
//     */
//    fromJSON(data: PartialJSONObject): void {
//      this.sharedModel.transact(() => {
//     //    this.sharedModel.setContent('position', { x: data.x, y: data.y });
//     //    this.sharedModel.setContent('content', data.content);
//      });
//    }

// }
