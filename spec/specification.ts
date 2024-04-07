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
  components: Component[];
  /**
   * The links of the system.
   */
  links: Link[];
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
   * The display name of the component. Has precedence over the name of the component.
   */
  displayName?: string;
  /**
   * The description of the component, in markdown format.
   */
  description?: string;
  /**
   * The position of the component.
   */
  position: {
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
  components: Component[];
  /**
   * The links of the system.
   */
  links: Link[];
}
/**
 * A link
 */
export interface Link {
  /**
   * The name of the link. Must be unique across the system.
   */
  name: string;
  /**
   * The display name of the link. Has precedence over the name of the link.
   */
  displayName?: string;
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
  /**
   * Sub-component in side B of the link.
   */
  subComponentBName?: string;
}

const schemas = [
  {
    $id: "https://dataflows.io/component.json",
    title: "Component",
    description: "A component",
    type: "object",
    required: ["name", "position"],
    additionalProperties: false,
    properties: {
      name: {
        type: "string",
        pattern: "^[a-z0-9_-]+$",
        description:
          "The name of the component. Must be unique across the system.",
      },
      displayName: {
        type: "string",
        description:
          "The display name of the component. Has precedence over the name of the component.",
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
            maximum: 128,
          },
          y: {
            type: "integer",
            description: "The Y position of the component.",
            minimum: 0,
            maximum: 128,
          },
        },
      },
      system: {
        $ref: "https://dataflows.io/subsystem.json",
      },
    },
  },
  {
    $id: "https://dataflows.io/link.json",
    title: "Link",
    description: "A link",
    type: "object",
    required: ["name", "componentAName", "componentBName"],
    additionalProperties: false,
    properties: {
      name: {
        type: "string",
        pattern: "^[a-z0-9_-]+$",
        description: "The name of the link. Must be unique across the system.",
      },
      displayName: {
        type: "string",
        description:
          "The display name of the link. Has precedence over the name of the link.",
      },
      description: {
        type: "string",
        description: "The description of the link, in markdown format.",
      },
      componentAName: {
        type: "string",
        pattern: "^[a-z0-9_-]+$",
        description: "Side A of the link.",
      },
      componentBName: {
        type: "string",
        pattern: "^[a-z0-9_-]+$",
        description: "Side B of the link.",
      },
      subComponentBName: {
        type: "string",
        pattern: "^[a-z0-9_-]+$",
        description: "Sub-component in side B of the link.",
      },
    },
  },
  {
    $id: "https://dataflows.io/subsystem.json",
    title: "Subsystem",
    description: "A sub-system",
    type: "object",
    required: ["components", "links"],
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
    required: ["specificationVersion", "name", "components", "links"],
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
    },
  },
];

import ajv from "ajv";

export const specification = new ajv({ schemas, allErrors: true });
