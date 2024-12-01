/**
 * A utility type for representing the result of an operation.
 * On behalf of Rust's Result type.
 */
export type Result<T, E> = {
    success: true;
    value: T;
} | {
    success: false;
    error: E;
};
