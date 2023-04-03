import {Injectable} from "@nestjs/common";
import crypto from "crypto";

/**
 * A class that provides an interface for generating and verifying SHA-512 hashes.
 */
@Injectable()
export class CustomHashing {
    // The hashing algorithm to use
    private algorithm: string = "sha512";

    // The number of iterations for the key derivation function
    private iterations: number = 1000;

    // The length of the generated key
    private keyLength: number = 64;

    // The password used to generate the encryption key
    private password: string = process.env.PASS_ENCRYPTION;

    /**
     * Generates a salted hash for the given string
     * @param str The string to be hashed
     * @returns A salted hash in the format "{salt}:{hash}"
     */
    public stringToHash(str: string): string {
        // Generate a random salt
        const salt = crypto.randomBytes(16).toString("hex");

        // Generate a key from the password and use it to derive a hash from the string
        const hash = crypto
            .pbkdf2Sync(
                str,
                this.generateEncryptionKey(),
                this.iterations,
                this.keyLength,
                this.algorithm
            )
            .toString("hex");

        // Return the salt and hash concatenated with a colon separator
        return `${salt}:${hash}`;
    }

    /**
     * Checks if a given password matches a salted hash
     * @param password The password to check
     * @param hash The salted hash to compare against
     * @returns True if the password matches the hash, false otherwise
     */
    public checkHash(password: string, hash: string): boolean {
        // Extract the salt and original hash from the stored hash
        const [salt, originalHash] = hash.split(":");

        // Generate a hash from the input password using the same salt and key as the original hash
        const inputHash = crypto
            .pbkdf2Sync(
                password,
                this.generateEncryptionKey(),
                this.iterations,
                this.keyLength,
                this.algorithm
            )
            .toString("hex");

        // Compare the two hashes
        return originalHash === inputHash;
    }

    /**
     * Generates an encryption key from the configured password
     * @returns The encryption key as a Buffer
     */
    private generateEncryptionKey(): Buffer {
        // Generate a key from the password using a fixed salt and number of iterations
        return crypto.pbkdf2Sync(
            this.password,
            "salt",
            this.iterations,
            this.keyLength,
            this.algorithm
        );
    }
}
