/**
 * A system
 */
export interface System {
  /**
   * The version of the specification, in semver format.
   */
  specification: '1.0.0';
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
   * The sub-components of the component.
   */
  components?: Component[];
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
  a: string;
  /**
   * Side B of the link.
   */
  b: string;
}

