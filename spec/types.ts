/**
 * A system
 */
export interface System {
  /**
   * The version of the specification, in semver format.
   */
  specificationVersion: '1.0.0';
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
  /**
   * The size of the component.
   */
  size?: {
    /**
     * The width of the component.
     */
    width: number;
    /**
     * The height of the component.
     */
    height: number;
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
  componentAId: string;
  /**
   * Side B of the link.
   */
  componentBId: string;
}

