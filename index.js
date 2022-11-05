const { resolve } = require('path');
const { readFileSync, writeFileSync } = require('fs');
const { isValidSemVer, parseSemVer } = require('semver-parser');
const { build: objectToPlist, parse: plistToObject } = require('plist');
const validateOptions = require('schema-utils');
const schema = require('./schema.json');

class NativescriptAppVersionPlugin {

    static ANDROID_VERSION_CODE_MAX = 2100000000;

    static defaultOptions = {
        appResourcesPath: 'App_Resources',
        isAndroid: false,
        isIOS: false,
        version: '0.1.0',
    }

    /**
     * @param {NativescriptAppVersionPlugin.defaultOptions} instanceOptions 
     */
    constructor(instanceOptions = {}) {
        this.options = { ...NativescriptAppVersionPlugin.defaultOptions, ...instanceOptions };

        validateOptions(schema, this.options, { name: this.constructor.name, baseDataPath: "options" });
        
        const semver = parseSemVer(this.options.version);

        if (!isValidSemVer(this.options.version)) {
            throw Error('Invalid Version Code');
        } else if (this.options.android && NativescriptAppVersionPlugin.ANDROID_VERSION_CODE_MAX > parseInt(semver.build, 10)) {
            throw Error('Android versionCode exceeds ANDROID_VERSION_CODE_MAX');
        }

        this.options.semver = {
            build: `${semver.build || 1}`,
            version: `${semver.major}.${semver.minor}.${semver.patch}`,
        }
    }

    apply(compiler) {
        const hook = this.setPlatformVersion.bind(this);
        compiler.hooks.beforeRun.tap(this.constructor.name, hook);
    }

    setPlatformVersion() {
        const { appResourcesPath, isAndroid, semver } = this.options;
        const absPath = resolve(appResourcesPath, isAndroid ? 'android/src/main' :'iOS', isAndroid ? 'AndroidManifest.xml' : 'Info.plist');
        let fileContent = readFileSync(absPath, 'utf8');
        if (isAndroid) {
            fileContent = fileContent
            .replace(/(versionCode=".*?")/, `versionCode="${semver.build}"`)
            .replace(/(versionName=".*?")/, `versionName="${semver.version}"`)
        } else {
            const { build: CFBundleVersion, version: CFBundleShortVersionString } = semver;
            fileContent = objectToPlist({ ...plistToObject(fileContent), CFBundleShortVersionString, CFBundleVersion });
        }
        writeFileSync(absPath, fileContent, 'utf8');
    }
}

module.exports = {
    NativescriptAppVersionPlugin,
    default: NativescriptAppVersionPlugin
};
