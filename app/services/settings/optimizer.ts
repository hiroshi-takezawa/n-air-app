import { $t } from 'services/i18n';
import { ISettingsSubCategory } from './settings-api';

export enum OptimizationKey {
    outputMode = 'outputMode',
    videoBitrate = 'videoBitrate',
    audioBitrate = 'audioBitrate',
    quality = 'quality',
    colorSpace = 'colorSpace',
    fps = 'fps',
    encoder = 'encoder',
    keyframeInterval = 'keyframeInterval',
    encoderPreset = 'encoderPreset',
    profile = 'profile',
    tune = 'tune',
    audioTrackIndex = 'audioTrackIndex',
}

// OptimizationKey のキーと完全対応していること
export type OptimizeSettings = {
    outputMode?: string
    videoBitrate?: number
    audioBitrate?: string
    quality?: string
    colorSpace?: string
    fps?: string
    encoder?: string
    keyframeInterval?: number
    encoderPreset?: string
    profile?: string
    tune?: string
    audioTrackIndex?: string
};

enum CategoryName {
    output = 'Output',
    video = 'Video',
    advanced = 'Advanced',
}

export type DefinitionParam = {
    key: OptimizationKey,
    category: CategoryName,
    subCategory: string,
    setting: string,
    label?: string,
    lookupValueName?: boolean,
    dependents?: { value: any, params: DefinitionParam[] }[],
};

const definitionParams: DefinitionParam[] = [
    {
        key: OptimizationKey.outputMode,
        category: CategoryName.output,
        subCategory: 'Untitled',
        setting: 'Mode',
        lookupValueName: true,
        dependents: [{
            value: 'Advanced',
            params: [
                {
                    key: OptimizationKey.videoBitrate,
                    category: CategoryName.output,
                    subCategory: 'Streaming',
                    setting: 'bitrate',
                    label: 'settings.videoBitrate',
                },
                {
                    key: OptimizationKey.audioBitrate,
                    category: CategoryName.output,
                    subCategory: 'Audio - Track 1',
                    setting: 'Track1Bitrate',
                    label: 'settings.audioBitrate',
                },
                {
                    key: OptimizationKey.encoder,
                    category: CategoryName.output,
                    subCategory: 'Streaming',
                    setting: 'Encoder',
                    lookupValueName: true,
                    dependents: [{
                        value: 'obs_x264',
                        params: [
                            {
                                key: OptimizationKey.encoderPreset,
                                category: CategoryName.output,
                                subCategory: 'Streaming',
                                setting: 'preset',
                                label: 'settings.encoderPreset',
                                lookupValueName: true,
                            },
                            {
                                key: OptimizationKey.tune,
                                category: CategoryName.output,
                                subCategory: 'Streaming',
                                setting: 'tune',
                                lookupValueName: true,
                            },
                        ]
                    }]
                },
                {
                    key: OptimizationKey.keyframeInterval,
                    category: CategoryName.output,
                    subCategory: 'Streaming',
                    label: 'settings.keyframeInterval',
                    setting: 'keyint_sec',
                },
                {
                    key: OptimizationKey.profile,
                    category: CategoryName.output,
                    subCategory: 'Streaming',
                    setting: 'profile',
                    lookupValueName: true,
                },
                {
                    key: OptimizationKey.audioTrackIndex,
                    category: CategoryName.output,
                    subCategory: 'Streaming',
                    setting: 'TrackIndex',
                },
            ]
        }]
    },
    {
        key: OptimizationKey.quality,
        category: CategoryName.video,
        subCategory: 'Untitled',
        setting: 'Output',
        label: 'streaming.resolution',
        lookupValueName: true,
    },
    {
        key: OptimizationKey.colorSpace,
        category: CategoryName.advanced,
        subCategory: 'Video',
        setting: 'ColorSpace',
    },
    {
        key: OptimizationKey.fps,
        category: CategoryName.video,
        subCategory: 'Untitled',
        setting: 'FPSCommon',
        label: 'streaming.FPS',
    },
];

export interface OptimizedSettings {
    delta: OptimizeSettings;
    current: OptimizeSettings;
    info: [CategoryName, {
        key: string,
        name: string,
        currentValue: string,
        newValue?: string
    }[]][];
}

/**
 * i18n用pathを組み立てる。
 * 空白を含む階層はドット記法で接続出来ないので置き換える
 */
function i18nPath(top: string, ...args: string[]): string {
    return top + [...args].map(s => {
        if (s.match(/\s/)) {
            return `['${s}']`;
        }
        return `.${s}`;
    }).join('');
}

class OptKeyProperty {
    key: OptimizationKey;
    category: CategoryName;
    subCategory: string;
    setting: string;

    private _label: string;
    private lookupValueName: boolean;

    constructor(options: DefinitionParam) {
        this.key = options.key;
        this.category = options.category;
        this.subCategory = options.subCategory;
        this.setting = options.setting;
        if (options.label) {
            this._label = options.label;
        } else {
            this._label = i18nPath('settings', options.category, options.subCategory, options.setting, 'name');
        }
        this.lookupValueName = options.lookupValueName;
    }

    get label(): string {
        const t = $t(this._label);
        if (t !== this._label) {
            return t;
        }
        console.log(`label '${this._label}' not found for ${this.key}`);
        return this.setting;
    }

    value(v: any): string {
        if (v === undefined) {
            console.error(`value(undefined): ${i18nPath('settings', this.category, this.subCategory, this.setting)}`);
            return;
        }
        if (this.lookupValueName) {
            const t = i18nPath('settings', this.category, this.subCategory, this.setting, v);
            const name = $t(t);
            if (t !== name) {
                return name;
            }
        }
        return v;
    }
}

type OptimizeItem = {
    key: string,
    name: string,
    currentValue: string,
    newValue?: string
};

function* iterateDefinitions(params: DefinitionParam[]): IterableIterator<DefinitionParam> {
    for (const item of params) {
        yield item;
        if (item.dependents) {
            for (const keyParams of item.dependents) {
                for (const prop of iterateDefinitions(keyParams.params)) {
                    yield prop;
                }
            }
        }
    }
}

function isDependValues(values: OptimizeSettings, items: DefinitionParam[]): boolean {
    for (const item of items) {
        if (values.hasOwnProperty(item.key)) {
            return true;
        }
        if (item.dependents) {
            for (const dependent of item.dependents) {
                if (isDependValues(values, dependent.params)) {
                    return true;
                }
            }
        }
    }
    return false;
}

function validateDefinitionParams(params: DefinitionParam[]) {
    const actual = new Set<string>(Array.from(iterateDefinitions(params)).map(d => d.key));
    const missing = [];
    for (const key of Object.values(OptimizationKey)) {
        if (!actual.has(key)) {
            missing.push(key);
        }
    }
    if (missing.length > 0) {
        console.error(`niconico-optimization: : missing keys in definitionParams: ${missing}`);
    }
}
validateDefinitionParams(definitionParams);

export interface ISettingsAccessor {
    getSettingsFormData(categoryName: string): ISettingsSubCategory[];
    findSetting(settings: ISettingsSubCategory[], category: string, setting: string): any;
    findSettingValue(settings: ISettingsSubCategory[], category: string, setting: string): any;
    setSettings(categoryName: string, settingsData: ISettingsSubCategory[]): void;
}

export class Optimizer {
    private accessor: ISettingsAccessor;
    private definitions: DefinitionParam[];

    constructor(accessor: ISettingsAccessor) {
        this.accessor = accessor;
        this.definitions = definitionParams;
    }

    private categoryCache = new Map<CategoryName, ISettingsSubCategory[]>();
    private modifiedCategories = new Set<CategoryName>();

    private getCategory(category: CategoryName, reload: boolean = false): ISettingsSubCategory[] {
        if (reload || !this.categoryCache.has(category)) {
            console.log(`getCategory: ${category}`);
            this.categoryCache.set(category, this.accessor.getSettingsFormData(category));
        }
        return this.categoryCache.get(category);
    }

    private updateCategory(category: CategoryName) {
        if (this.categoryCache.has(category)) {
            console.log(`updateCategory: ${category}`);
            this.accessor.setSettings(category, this.getCategory(category));
        }
    }

    private writeBackCategory(category: CategoryName) {
        if (this.modifiedCategories.has(category)) {
            this.updateCategory(category);
            this.modifiedCategories.delete(category);
        }
    }

    private writeBackAllCategories() {
        for (const category of this.modifiedCategories) {
            this.updateCategory(category);
        }
        this.modifiedCategories.clear();
    }

    private forgetCategoryCache(category: CategoryName) {
        if (this.categoryCache.has(category)) {
            this.categoryCache.delete(category);
            if (this.modifiedCategories.has(category)) {
                this.modifiedCategories.delete(category);
            }
        }
    }

    private findValue(i: DefinitionParam) {
        return this.accessor.findSettingValue(this.getCategory(i.category), i.subCategory, i.setting);
    }

    private findSetting(i: DefinitionParam) {
        return this.accessor.findSetting(this.getCategory(i.category), i.subCategory, i.setting);
    }

    private setValue(item: DefinitionParam, value: any) {
        console.log(`setValue: ${item.category}/${item.key}: ${value}`);
        const setting = this.findSetting(item);
        if (setting) {
            if (setting.value !== value) {
                if (item.dependents) {
                    // dependents は item の値に依存して出現したり消滅したりする。
                    // 存在するときの修正は item 変更前に書き戻さないと反映されないため、事前に書き戻す。
                    for (const dependent of item.dependents) {
                        for (const subItem of dependent.params) {
                            this.writeBackCategory(subItem.category);
                        }
                    }
                }
                console.log(`setValue: ${item.category}/${item.key}: ${setting.value} -> ${value}`);
                setting.value = value;
                const category = item.category;
                this.modifiedCategories.add(category);
                if (item.dependents) {
                    // itemを変更すると、それに従って dependents全体が切り替わるため、
                    // item自体の変更は即時で送信し、以後 dependentsを参照するときには読み直させるために
                    // キャッシュを破棄する。(事前に上で変更は書き戻しているので単純破棄)
                    // 変更後に破棄するのは、この破棄対象カテゴリがこのitem自身と同じケースがあるため。
                    this.writeBackCategory(category);
                    for (const dependent of item.dependents) {
                        for (const subItem of dependent.params) {
                            this.forgetCategoryCache(subItem.category);
                        }
                    }
                }
            }
        } else {
            console.warn(`key not found: ${item.key}`);
        }
    }

    private *getValues(definitions: DefinitionParam[]): IterableIterator<{}> {
        for (const item of definitions) {
            const value = this.findValue(item);
            yield { [item.key]: value };
            if (item.dependents) {
                for (const dependent of item.dependents) {
                    this.setValue(item, dependent.value);
                    for (const current of this.getValues(dependent.params)) {
                        yield current;
                    }
                }
                this.setValue(item, value);
            }
        }
    }

    private setValues(values: OptimizeSettings, definitions: DefinitionParam[]) {
        for (const item of definitions) {
            const key = item.key;
            if (item.dependents) {
                let value = this.findValue(item);
                for (const dependent of item.dependents) {
                    if (isDependValues(values, dependent.params)) {
                        this.setValue(item, dependent.value);
                        this.setValues(values, dependent.params);
                    }
                }
                if (values.hasOwnProperty(key)) {
                    value = values[key];
                }
                this.setValue(item, value);
            } else {
                if (values.hasOwnProperty(key)) {
                    this.setValue(item, values[key]);
                }
            }
        }
    }

    getCurrentSettings(): OptimizeSettings {
        return Object.assign({}, ...this.getValues(this.definitions));
    }

    optimize(optimized: OptimizeSettings) {
        this.setValues(optimized, this.definitions);
        this.writeBackAllCategories();
    }

    optimizeInfo(current: OptimizeSettings, optimized: OptimizeSettings): [CategoryName, OptimizeItem[]][] {
        const map = new Map<CategoryName, OptimizeItem[]>();
        for (const definition of iterateDefinitions(this.definitions)) {
            const opt = new OptKeyProperty(definition);
            const key = opt.key;
            const category = opt.category;
            let item;
            if (optimized.hasOwnProperty(key)) {
                item = {
                    key,
                    name: opt.label,
                    currentValue: opt.value(current[key]),
                    newValue: opt.value(optimized[key])
                };
            } else {
                item = {
                    key,
                    name: opt.label,
                    currentValue: opt.value(current[key]),
                };
            }

            if (!map.has(category)) {
                map.set(category, [item]);
            } else {
                map.get(category).push(item);
            }
        }
        return Array.from(map);
    }
}