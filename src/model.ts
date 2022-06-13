import { DocumentRegistry } from '@jupyterlab/docregistry';

import { YDocument, MapChange } from '@jupyterlab/shared-models';

import { IModelDB, ModelDB } from '@jupyterlab/observables';

import { IChangeArgs, IChangedArgs } from '@jupyterlab/coreutils';

import { PartialJSONObjects } from '@lumino/coreutils';

import { ISignal, Signal } from '@lumino/signaling';


/**
 * UrdfModel: this Model represents the content of the file
 */
export class UrdfModel implements DocumentRegistry.IModel {
    /**
    * Construct new UrdfModel
    * 
    * @param languagePreference Language
    * @param modelDB Model database
    */
    constructor(languagePreference?: string, modelDB?: IModelDB) {
        this.modelDB = modelDB || new ModelDB();
    }

    /**
     * Get/set the dirty attribute to know when  
     * content in document differs from disk
     * 
     * @returns dirty attribute
     */
    get dirty(): boolean {
        return this._dirty;
    }
    set dirty(value: boolean) {
        this._dirty = value;
    }

    /**
     * Get/set the readOnly attribute to know when
     * model is read only or not
     * 
     * @returns readOnly attribute
     */
    get readOnly(): boolean {
        return this._readOnly;
    }
    set readOnly(value: boolean) {
        this._readOnly = value;
    }

    /**
     * Get isDisposed attribute to know whether
     * this model has been disposed or not
     * 
     * @returns Model disposed status
     */
    get isDisposed(): boolean {
        return this._isDisposed;
    }

    /**
     * Get the signal contentChange to listen for 
     * changes on the content (data stored in model)
     * 
     * @returns The signal
     */
    get contentChanged(): ISignal<this, void> {
        return this._contentChanged;
    }

    /**
     * Get the signal stateChange to listen for
     * changes on the state (metadata or attributes of model)
     * 
     * @returns The signal
     */
    get stateChanged(): ISignal<this, IChangedArgs<any, any, string>> {
        return this._stateChanged;
    }

    /**
     * Dispose of the resources held by the model
     */
    dispose(): void {
        if (this._isDisposed) {
            return;
        }
        this._isDisposed = true;
        Signal.clearData(this);
    }

    /**
     * Returns data needed to be stored in disk as string.
     * The context will call this method to get the file's
     * content and save it to disk.
     * 
     * @returns The data
     */
    toString(): string {
        //TODO
    }

    /**
     * The context will call this method when loading data from disk.
     * This method should implement the logic to parse the data and
     * store it on the datastore.
     * 
     * @returns The serialized data
     */
    fromString(value: string): void {
        //TODO
    }

    initialize(): void {
        // nothing to do? || TODO
    }

    private _dirty = false;
    private _readOnly = false;
    private _isDisposed = false;
    private _contentChanged = new Signal<this, void>(this);
    private _stateChanged = new Signal<this, IChangeArgs<any>>(this);



}