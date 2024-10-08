export type SubsystemType = "box" | "list";
export type TextFont = "text" | "sketch" | "code";
export type TextAlign = "left" | "center" | "right";
export type BorderPattern = "light" | "solid" | "dotted";
export type BorderEdge = "round" | "straight";
export type PathEndingPattern = "none" | "solid-arrow";
export type PathPattern = "solid-line" | "dotted-line" | "pipe";

/**
 * A system
 */
export interface System {
  /**
   * The version of the specification, in semver format.
   */
  specificationVersion: "1.0.0";
  /**
   * The title of the system.
   */
  title: string;
  /**
   * The description of the system, in markdown format.
   */
  description?: string;
  /**
   * The sub-systems of the system.
   */
  systems?: Subsystem[];
  /**
   * The links of the system and sub-systems.
   */
  links?: Link[];
}
/**
 * A sub-system
 */
export interface Subsystem {
  /**
   * The id of the sub-system. Must be unique across the entire system.
   */
  id: string;
  /**
   * The type of the sub-system.
   */
  type?: SubsystemType & string;
  /**
   * The title of the sub-system.
   */
  title?: string;
  /**
   * The font of the title
   */
  titleFont?: TextFont;
  /**
   * The alignment of the title
   */
  titleAlign?: TextAlign;
  /**
   * The size of the title.
   */
  titleSize?: {
    /**
     * The width of the title.
     */
    width: number;
    /**
     * The height of the title.
     */
    height: number;
  };
  /**
   * The pattern of the border of the system
   */
  borderPattern?: BorderPattern;
  /**
   * The edges style of the border of the system
   */
  borderEdges?: BorderEdge;
  /**
   * The opacity of the system
   */
  opacity?: number;
  /**
   * The description of the sub-system, in markdown format.
   */
  description?: string;
  /**
   * The position of the sub-system in the parent system.
   */
  position: {
    /**
     * The X position of the sub-system in the parent system.
     */
    x: number;
    /**
     * The Y position of the sub-system in the parent system.
     */
    y: number;
  };
  /**
   * The background color of the sub-system.
   */
  backgroundColor?: string;
  /**
   * The sub-systems of the system.
   */
  systems?: Subsystem[];
}
/**
 * A link
 */
export interface Link {
  /**
   * The title of the link.
   */
  title?: string;
  /**
   * The description of the link, in markdown format.
   */
  description?: string;
  /**
   * The background color of the link title.
   */
  titleBackgroundColor?: string;
  /**
   * The font of the title
   */
  titleFont?: TextFont;
  /**
   * The alignment of the title
   */
  titleAlign?: TextAlign;
  /**
   * The size of the title.
   */
  titleSize?: {
    /**
     * The width of the title.
     */
    width: number;
    /**
     * The height of the title.
     */
    height: number;
  };
  /**
   * The pattern of the border of the title
   */
  titleBorderPattern?: BorderPattern;
  /**
   * The edges style of the border of the title
   */
  titleBorderEdges?: BorderEdge;
  /**
   * The opacity of the title
   */
  titleOpacity?: number;
  /**
   * The opacity of the link
   */
  opacity?: number;
  /**
   * The background color of the link.
   */
  backgroundColor?: string;
  /**
   * The pattern of the first path segment
   */
  startPattern?: PathEndingPattern;
  /**
   * The pattern of the path from A to B
   */
  middlePattern?: PathPattern;
  /**
   * The pattern of the last path segment
   */
  endPattern?: PathEndingPattern;
  /**
   * Side A of the link.
   */
  a: string;
  /**
   * Side B of the link.
   */
  b: string;
}

const schemas = [
  {
    $id: "definitions",
    $defs: {
      textFont: {
        $id: "TextFont",
        type: "string",
        enum: ["text", "sketch", "code"],
      },
      textAlign: {
        $id: "TextAlign",
        type: "string",
        enum: ["left", "center", "right"],
      },
      borderPattern: {
        $id: "BorderPattern",
        type: "string",
        enum: ["light", "solid", "dotted"],
      },
      borderEdge: {
        $id: "BorderEdge",
        type: "string",
        enum: ["round", "straight"],
      },
    },
  },
  {
    $id: "link",
    title: "Link",
    description: "A link",
    type: "object",
    required: ["a", "b"],
    additionalProperties: false,
    properties: {
      title: {
        type: "string",
        description: "The title of the link.",
      },
      description: {
        type: "string",
        description: "The description of the link, in markdown format.",
      },
      titleBackgroundColor: {
        type: "string",
        description: "The background color of the link title.",
      },
      titleFont: {
        description: "The font of the title",
        allOf: [
          {
            $ref: "definitions#/$defs/textFont",
          },
        ],
      },
      titleAlign: {
        description: "The alignment of the title",
        allOf: [
          {
            $ref: "definitions#/$defs/textAlign",
          },
        ],
      },
      titleSize: {
        type: "object",
        description: "The size of the title.",
        required: ["width", "height"],
        additionalProperties: false,
        properties: {
          width: {
            type: "integer",
            description: "The width of the title.",
          },
          height: {
            type: "integer",
            description: "The height of the title.",
          },
        },
      },
      titleBorderPattern: {
        description: "The pattern of the border of the title",
        allOf: [
          {
            $ref: "definitions#/$defs/borderPattern",
          },
        ],
      },
      titleBorderEdges: {
        description: "The edges style of the border of the title",
        allOf: [
          {
            $ref: "definitions#/$defs/borderEdge",
          },
        ],
      },
      titleOpacity: {
        description: "The opacity of the title",
        type: "number",
        minimum: 0,
        maximum: 1,
      },
      opacity: {
        description: "The opacity of the link",
        type: "number",
        minimum: 0,
        maximum: 1,
      },
      backgroundColor: {
        type: "string",
        description: "The background color of the link.",
      },
      startPattern: {
        description: "The pattern of the first path segment",
        allOf: [
          {
            $ref: "#/$defs/pathEndingPattern",
          },
        ],
      },
      middlePattern: {
        description: "The pattern of the path from A to B",
        allOf: [
          {
            $ref: "#/$defs/pathPattern",
          },
        ],
      },
      endPattern: {
        description: "The pattern of the last path segment",
        allOf: [
          {
            $ref: "#/$defs/pathEndingPattern",
          },
        ],
      },
      a: {
        type: "string",
        pattern: "^[a-z0-9_-]+$",
        description: "Side A of the link.",
      },
      b: {
        type: "string",
        pattern: "^[a-z0-9_-]+$",
        description: "Side B of the link.",
      },
    },
    $defs: {
      pathPattern: {
        $id: "PathPattern",
        type: "string",
        enum: ["solid-line", "dotted-line", "pipe"],
      },
      pathEndingPattern: {
        $id: "PathEndingPattern",
        type: "string",
        enum: ["none", "solid-arrow"],
      },
    },
  },
  {
    $id: "subsystem",
    title: "Subsystem",
    description: "A sub-system",
    type: "object",
    required: ["id", "position"],
    additionalProperties: false,
    properties: {
      id: {
        type: "string",
        pattern: "^[a-z0-9_-]+$",
        maxLength: 32,
        description:
          "The id of the sub-system. Must be unique across the entire system.",
      },
      type: {
        type: "string",
        description: "The type of the sub-system.",
        allOf: [
          {
            $ref: "#/$defs/type",
          },
        ],
      },
      title: {
        type: "string",
        description: "The title of the sub-system.",
      },
      titleFont: {
        description: "The font of the title",
        allOf: [
          {
            $ref: "definitions#/$defs/textFont",
          },
        ],
      },
      titleAlign: {
        description: "The alignment of the title",
        allOf: [
          {
            $ref: "definitions#/$defs/textAlign",
          },
        ],
      },
      titleSize: {
        type: "object",
        description: "The size of the title.",
        required: ["width", "height"],
        additionalProperties: false,
        properties: {
          width: {
            type: "integer",
            description: "The width of the title.",
          },
          height: {
            type: "integer",
            description: "The height of the title.",
          },
        },
      },
      borderPattern: {
        description: "The pattern of the border of the system",
        allOf: [
          {
            $ref: "definitions#/$defs/borderPattern",
          },
        ],
      },
      borderEdges: {
        description: "The edges style of the border of the system",
        allOf: [
          {
            $ref: "definitions#/$defs/borderEdge",
          },
        ],
      },
      opacity: {
        description: "The opacity of the system",
        type: "number",
        minimum: 0,
        maximum: 1,
      },
      description: {
        type: "string",
        description: "The description of the sub-system, in markdown format.",
      },
      position: {
        type: "object",
        description: "The position of the sub-system in the parent system.",
        required: ["x", "y"],
        additionalProperties: false,
        properties: {
          x: {
            type: "integer",
            description:
              "The X position of the sub-system in the parent system.",
          },
          y: {
            type: "integer",
            description:
              "The Y position of the sub-system in the parent system.",
          },
        },
      },
      backgroundColor: {
        type: "string",
        description: "The background color of the sub-system.",
      },
      systems: {
        type: "array",
        description: "The sub-systems of the system.",
        items: {
          $ref: "subsystem",
        },
      },
    },
    $defs: {
      type: {
        $id: "SubsystemType",
        type: "string",
        enum: ["box", "list"],
      },
    },
  },
  {
    $id: "system",
    title: "System",
    description: "A system",
    type: "object",
    required: ["specificationVersion", "title"],
    additionalProperties: false,
    properties: {
      specificationVersion: {
        type: "string",
        description: "The version of the specification, in semver format.",
        enum: ["1.0.0"],
      },
      title: {
        type: "string",
        description: "The title of the system.",
      },
      description: {
        type: "string",
        description: "The description of the system, in markdown format.",
      },
      systems: {
        type: "array",
        description: "The sub-systems of the system.",
        items: {
          $ref: "subsystem",
        },
      },
      links: {
        type: "array",
        description: "The links of the system and sub-systems.",
        items: {
          $ref: "link",
        },
      },
    },
  },
];

import ajv from "ajv";

export const specification = new ajv({ schemas, allErrors: true });
