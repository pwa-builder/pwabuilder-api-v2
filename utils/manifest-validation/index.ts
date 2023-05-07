import { Manifest, singleFieldValidation, Validation } from "./interfaces.js";
export { Manifest, Validation, singleFieldValidation } from "./interfaces.js";
import { findMissingKeys, isValidJSON, isValidURL, validProtocols } from "./utils/validation-utils.js";
export { required_fields, recommended_fields, optional_fields, validateSingleRelatedApp } from "./utils/validation-utils.js";
import { maniTests, findSingleField, loopThroughKeys, loopThroughRequiredKeys } from "./validations.js";

export let currentManifest: Manifest | undefined;

export async function validateManifest(manifest: Manifest): Promise<Validation[]> {
    return new Promise(async(resolve, reject) => {
        const validJSON = isValidJSON(manifest);

        if (validJSON === false) {
            reject('Manifest is not valid JSON');
        }

        currentManifest = manifest;
        let data = await loopThroughKeys(manifest);

        resolve(data);
    });
}

export async function validateSingleField(field: string, value: any): Promise<singleFieldValidation> {
    return new Promise(async (resolve, reject) => {
        try {
            const data = await findSingleField(field, value);
            //console.log('data', data);
            resolve(data);
        }
        catch(err) {
            reject(err);
        }
    })
}

export async function reportMissing(manifest: Manifest): Promise<Array<string>> {
    return new Promise(async(resolve) => {
        const data = await findMissingKeys(manifest);
        if (data && data.length > 0) {
            resolve(data);
        } else {
            resolve([]);
        }
    })
}

export async function validateRequiredFields(manifest: Manifest): Promise<Validation[]> {
    return new Promise(async(resolve, reject) => {
        const validJSON = isValidJSON(manifest);
        if (validJSON === false) {
            reject('Manifest is not valid JSON');
        }

        let data = await loopThroughRequiredKeys(manifest);
        if (data && data.length > 0) {
            resolve(data);
        }
    });
}

export async function validateImprovements(manifest: Manifest): Promise<Validation[]> {
    const optionalValidationErrors: Validation[] = [];

    const validJSON = isValidJSON(manifest);

    if (validJSON === false) {
        throw new Error('Manifest is not valid JSON');
    }

    for await (const test of maniTests) {
        if (test && test.category === "optional" && test.test) {
            if (Object.keys(manifest).includes(test.member) === true) {
                const testResult = await test.test(manifest[test.member]);

                if (testResult === false) {
                    optionalValidationErrors.push(test);
                }
            }
        }
    }

    return optionalValidationErrors;
}

export async function isInstallReady(manifest: Manifest): Promise<boolean> {
    const validJSON = isValidJSON(manifest);

    if (validJSON === false) {
        throw new Error('Manifest is not valid JSON');
    }

    const validations = await validateRequiredFields(manifest);

    return validations.length === 0;
}

function isValidRelativeURL(str: string){
    var pattern = new RegExp('^(?!www\.|(?:http|ftp)s?://|[A-Za-z]:\\|//).*');
    return !!pattern.test(str);
  }
  
  export function validateSingleProtocol(proto: any){
    let validProtocol = validProtocols.includes(proto.protocol) || proto.protocol.startsWith("web+") || proto.protocol.startsWith("web+")
    if(!validProtocol){
      return "protocol";
    }
  
    // i guess more importantly we should check if its in the scope of the site.
  
    let validURL = isValidURL(proto.url) || isValidRelativeURL(proto.url);
  
    if(!validURL){
      return "url";
    }
  
    return "valid";
  }

export * from './interfaces.js';