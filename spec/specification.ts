/**
 * A system
 */
export interface System {
  /**
   * The version of the specification, in semver format.
   */
  specificationVersion: "1.0.0";
  /**
   * The name of the system.
   */
  name: string;
  /**
   * The description of the system, in markdown format.
   */
  description?: string;
  /**
   * The components of the system.
   */
  components?: Component[];
  /**
   * The links of the system.
   */
  links?: Link[];
  /**
   * The flows of the system.
   */
  flows?: Flow[];
}
/**
 * A component
 */
export interface Component {
  /**
   * The name of the component. Must be unique across the system.
   */
  name: string;
  /**
   * The description of the component, in markdown format.
   */
  description?: string;
  /**
   * The position of the component.
   */
  position?: {
    /**
     * The X position of the component.
     */
    x: number;
    /**
     * The Y position of the component.
     */
    y: number;
  };
  system?: Subsystem;
}
/**
 * A sub-system
 */
export interface Subsystem {
  /**
   * The description of the system, in markdown format.
   */
  description?: string;
  /**
   * The components of the system.
   */
  components?: Component[];
  /**
   * The links of the system.
   */
  links?: Link[];
}
/**
 * A link
 */
export interface Link {
  /**
   * The description of the link, in markdown format.
   */
  description?: string;
  /**
   * Side A of the link.
   */
  componentAName: string;
  /**
   * Side B of the link.
   */
  componentBName: string;
}
/**
 * A flow
 */
export interface Flow {
  /**
   * The description of the flow, in markdown format.
   */
  description?: string;
  /**
   * The steps of the flow.
   */
  steps: {
    /**
     * The description of the step, in markdown format.
     */
    description?: string;
    /**
     * The keyframe of the step.
     */
    keyframe: number;
    /**
     * The name of the component where the data originates from
     */
    fromComponentName: string;
    /**
     * The name of the component where the data goes to
     */
    toComponentName: string;
    /**
     * The data of the step.
     */
    data?: string;
  }[];
}

const schemas = [
  {
    $id: "https://dataflows.io/component.json",
    title: "Component",
    description: "A component",
    type: "object",
    required: ["name"],
    additionalProperties: false,
    properties: {
      name: {
        type: "string",
        pattern: "^[a-z0-9_-]+$",
        maxLength: 32,
        description:
          "The name of the component. Must be unique across the system.",
      },
      description: {
        type: "string",
        description: "The description of the component, in markdown format.",
      },
      position: {
        type: "object",
        description: "The position of the component.",
        required: ["x", "y"],
        additionalProperties: false,
        properties: {
          x: {
            type: "integer",
            description: "The X position of the component.",
            minimum: 0,
            maximum: 64,
          },
          y: {
            type: "integer",
            description: "The Y position of the component.",
            minimum: 0,
            maximum: 64,
          },
        },
      },
      system: {
        $ref: "https://dataflows.io/subsystem.json",
      },
    },
  },
  {
    $id: "https://dataflows.io/flow.json",
    title: "Flow",
    description: "A flow",
    type: "object",
    required: ["steps"],
    additionalProperties: false,
    properties: {
      description: {
        type: "string",
        description: "The description of the flow, in markdown format.",
      },
      steps: {
        type: "array",
        description: "The steps of the flow.",
        items: {
          type: "object",
          required: ["fromComponentName", "toComponentName", "keyframe"],
          additionalProperties: false,
          properties: {
            description: {
              type: "string",
              description: "The description of the step, in markdown format.",
            },
            keyframe: {
              type: "integer",
              minimum: 0,
              description: "The keyframe of the step.",
            },
            fromComponentName: {
              type: "string",
              pattern: "^[a-z0-9_-]+(\\.[a-z0-9_-]+)*$",
              description:
                "The name of the component where the data originates from",
            },
            toComponentName: {
              type: "string",
              pattern: "^[a-z0-9_-]+(\\.[a-z0-9_-]+)*$",
              description: "The name of the component where the data goes to",
            },
            data: {
              type: "string",
              description: "The data of the step.",
            },
          },
        },
      },
    },
  },
  {
    $id: "https://dataflows.io/link.json",
    title: "Link",
    description: "A link",
    type: "object",
    required: ["componentAName", "componentBName"],
    additionalProperties: false,
    properties: {
      description: {
        type: "string",
        description: "The description of the link, in markdown format.",
      },
      componentAName: {
        type: "string",
        pattern: "^[a-z0-9_-]+(\\.[a-z0-9_-]+)*$",
        description: "Side A of the link.",
      },
      componentBName: {
        type: "string",
        pattern: "^[a-z0-9_-]+(\\.[a-z0-9_-]+)*$",
        description: "Side B of the link.",
      },
    },
  },
  {
    $id: "https://dataflows.io/subsystem.json",
    title: "Subsystem",
    description: "A sub-system",
    type: "object",
    required: [],
    additionalProperties: false,
    properties: {
      description: {
        type: "string",
        description: "The description of the system, in markdown format.",
      },
      components: {
        type: "array",
        description: "The components of the system.",
        items: {
          $ref: "https://dataflows.io/component.json",
        },
      },
      links: {
        type: "array",
        description: "The links of the system.",
        items: {
          $ref: "https://dataflows.io/link.json",
        },
      },
    },
  },
  {
    $id: "https://dataflows.io/system.json",
    title: "System",
    description: "A system",
    type: "object",
    required: ["specificationVersion", "name"],
    additionalProperties: false,
    properties: {
      specificationVersion: {
        type: "string",
        description: "The version of the specification, in semver format.",
        enum: ["1.0.0"],
      },
      name: {
        type: "string",
        pattern: "^[a-z0-9_-]+$",
        maxLength: 32,
        description: "The name of the system.",
      },
      description: {
        type: "string",
        description: "The description of the system, in markdown format.",
      },
      components: {
        type: "array",
        description: "The components of the system.",
        items: {
          $ref: "https://dataflows.io/component.json",
        },
      },
      links: {
        type: "array",
        description: "The links of the system.",
        items: {
          $ref: "https://dataflows.io/link.json",
        },
      },
      flows: {
        type: "array",
        description: "The flows of the system.",
        items: {
          $ref: "https://dataflows.io/flow.json",
        },
      },
    },
  },
];

import ajv from "ajv";

export const specification = new ajv({ schemas, allErrors: true });
