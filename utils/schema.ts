import Ajv, { ValidateFunction, ErrorObject } from "ajv";

function imageResourceSchema() {
  return {
    $id: "imageResource",
    required: ["src"],
    properties: {
      src: { type: "string" },
      sizes: { type: "string" },
      type: { type: "string" },
      purpose: { type: "string" }
    }
  };
}

function webAppSchema() {
  return {
    $id: "webApp",
    type: "object",
    required: ["name"],
    properties: {
      dir: { type: "string" },
      lang: { type: "string" },
      name: { type: "string" },
      short_name: { type: "string" },
      description: { type: "string" },
      icons: {
        type: "array",
        items: {
          $ref: "imageResource#"
        }
      },
      screenshots: {
        type: "array",
        items: {
          $ref: "imageResource#"
        }
      },
      categories: {
        type: "array",
        items: {
          type: "string"
        }
      },
      iarc_rating_id: {
        type: "string"
      },
      start_url: {
        type: "string"
      },
      display: {
        type: "string"
      },
      orientation: {
        type: "string"
      },
      theme_color: {
        type: "string"
      },
      background_color: {
        type: "string"
      },
      scope: {
        type: "string"
      },
      prefer_related_applications: {
        type: "boolean"
      }
    }
  };
}

const WebManifestSchema = {
  $ref: "webApp#"
};

export function load(schema = WebManifestSchema): ValidateFunction {
  const instance = new Ajv({ verbose: true });
  instance.addSchema(imageResourceSchema());
  instance.addSchema(webAppSchema());

  return instance.compile(schema);
}

interface ValidateResponse {
  isValid: boolean;
  parsedSuccessfully: boolean;
  errors?: Array<ErrorObject>;
}

export default function validate(manifestObj: unknown): ValidateResponse {
  try {
    const validate = load();
    if (validate(manifestObj)) {
      // Valid

      return {
        isValid: true,
        parsedSuccessfully: true
      };
    } else {
      // Handle Errors
      // for (const error of validate.errors as Array<Ajv.ErrorObject>) {
      //   // error.keyword
      // }

      return {
        isValid: false,
        parsedSuccessfully: true,
        errors: validate.errors ?? []
      };
    }
  } catch (error) {
    // Something unexpected happened.

    return {
      isValid: false,
      parsedSuccessfully: false
    };
  }
}
