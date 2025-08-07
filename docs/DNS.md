# 🐶 DNS (Doge Name Services)

Credits to apezord for providing the foundation for Dogecoin inscriptions and the Ordinals contributors like Ordifind for the Satoshi Name Services (SNS) protocol, which inspired the Doge Name Services (DNS) protocol. This document outlines the DNS protocol for managing namespaces and names on Dogecoin, integrated into the doginals.js script.


## ⚠️⚠️⚠️ Disclaimer ⚠️⚠️⚠️
This documentation is subject to change, and there is no guarantee of its completeness or accuracy. The DNS protocol is in active development and may evolve as the Dogecoin ecosystem grows.


## Overview

The Doge Name Services (DNS) protocol allows users to define and register unique namespaces and names on the Dogecoin blockchain, similar to domain names in traditional systems. DNS is derived from Bitcoin's Satoshi Name Services (SNS) and provides a standardized way to manage names (e.g., jared.doge) and namespaces (e.g., .doge, .oifi). These are inscribed as Dogecoin inscriptions, enabling indexers, marketplaces, and applications to track and utilize them consistently.
DNS serves as a powerful tool for builders, marketplaces, and indexers to organize and discover names across various namespaces. It supports simple text-based name registration and advanced JSON-based registration with additional metadata like avatars, reverse resolutions, and relays.

### Namespaces

#### Namespaces (e.g., .doge, .oifi, .dogim) define a category or domain for names. 
They are globally unique, with the first inscription of a namespace being the only valid instance ("first is first"). Namespaces help indexers and marketplaces identify and categorize names, but they do not grant special permissions or limit name inscriptions.


Notable Namespaces

```
.doge: Names on Dogecoin (e.g., jared.doge).
.oifi: Names on OrdiFind.com (e.g., user.oifi).
.dogim: Names tied to Dogim inscriptions (e.g., art.dogim).
```

Why Inscribe a Namespace?

- Discoverability: Helps indexers and marketplaces find and categorize your namespace.
- Clarity: Includes a description (about) to explain the namespace’s purpose.
- Branding: Supports an avatar or logo for visual representation on marketplaces.

### Namespace Operation

Namespaces are inscribed as JSON5 objects with the following schema:
{
  "p": "dns",
  "op": "dns",
  "ns": "doge",
  "about": "Names on Dogecoin.",
  "avatar": "e6c6efe91b6084eae2c8a2fd6470d3d0dbfbb342f1b8601904f45be8095058e2i0"
}




Key
Required?
Description



p
Yes
Protocol identifier: "dns".


op
Yes
Operation type: "dns" for namespace creation.


ns
Yes
Namespace name (e.g., doge). Do not include the period (.).


about
No
Short description (under 50 characters, e.g., "Names on Dogecoin.").


avatar
No
Inscription ID of an image/logo (e.g., e6c6efe...i0).


***Notes:***

Namespaces must use valid UTF-8 characters, but simple letters (A-Z, lowercase) are recommended for broad compatibility.
No periods (.) are allowed in the ns field.
Namespace inscriptions have no speculative or secondary market value and confer no special permissions.
Names can be inscribed in any namespace, even before the namespace is created.

**Namespace Limitations**

- Uniqueness: Only the first inscription of a namespace is valid, determined by inscription number.
- Format: Namespaces are indexed as lowercase, and spaces are not permitted.
- No Control: The namespace inscriber does not control or limit name inscriptions within it.

**Registering Names**

Names (e.g., jared.doge) are inscribed within a namespace and can be registered in two ways:



***Simple Registration:*** Inscribe a plain text string (e.g., jared.doge).

***Advanced Registration:*** Inscribe a JSON5 object with additional metadata.

**Simple Registration**

Inscribe a text-based name directly:

```
jared.doge
```

- Content Type: text/plain.
- Format: Must include the namespace (e.g., .doge) and contain exactly one period.

***Example Command:***

```
node . dns reg jared.doge
```

Output: Name TXID: abc123...



***Advanced Registration***

Inscribe a JSON5 object for additional metadata:

```
{
  "p": "dns",
  "op": "reg",
  "name": "jared.doge",
  "avatar": "e6c6efe91b6084eae2c8a2fd6470d3d0dbfbb342f1b8601904f45be8095058e2i0",
  "rev": "D9UcJkdirVLY11UtF77WnC8peg6xRYsogu",
  "relay": "f3b2c4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2i0"
}
```

Key
Required?
Expected Value
Description



p
Yes
"dns"
Protocol identifier.


op
Yes
"reg"
Operation type for name registration.


name
Yes
DNS name (e.g., jared.doge)
The desired name, including the namespace (e.g., .doge).


avatar
No
Inscription ID
Avatar/profile image, specified as an inscription ID.


rev
No
Dogecoin address
Reverse resolution: links the name to a Dogecoin address.


relay
No
Inscription ID
Points to another inscription (experimental, for delegation or linking).


Example Command:

node . dns reg jared.doge "e6c6efe91b6084eae2c8a2fd6470d3d0dbfbb342f1b8601904f45be8095058e2i0" "D9UcJkdirVLY11UtF77WnC8peg6xRYsogu" "f3b2c4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2i0"

Output: Name TXID: def456...



***Registration Limitations***

- Uniqueness: Only the first inscription of a name (by inscription number) is valid.
- Single Name per Inscription: Each inscription can register only one name.
- Valid Characters: Any UTF-8 character is allowed, but lowercase letters are recommended for compatibility.
-Case Insensitivity: Names are indexed as lowercase (e.g., Jared.Doge = jared.doge).
-No Spaces: Names cannot contain spaces or newlines.
-Namespace Requirement: Must include exactly one period and end with a valid namespace (e.g., .doge).


## Indexing DNS

For developers building indexers, the following steps outline how to extract and validate DNS names and namespaces from inscriptions.
Fetching Data

Retrieve the full Dogecoin inscription data, including content type, ID, and content, via an indexer like `https://wonky-ord-v2.dogeord.io/`

**Valid content types for DNS inscriptions:**

- text/plain (for simple registrations, e.g., jared.doge).

- application/json (for advanced registrations or namespaces).



**Validating Names**

For JSON5 Inscriptions:

- Validate the content as JSON5. If parsing fails, treat as plain text.


Check required keys:

- p: Must be "dns".
- op: Must be "reg" for names.
- name: Must be a string.


Extract the name field and proceed to validation steps.


**For Plain Text Inscriptions:**

Treat the raw content as the name (e.g., jared.doge).


Validation Steps:

- Ensure the content uses valid UTF-8 characters.
Convert to lowercase.

- Remove everything after the first whitespace or newline (\n).
Trim all whitespace and newlines.

- Verify exactly one period (.) exists.

- Confirm the name ends with a valid namespace (e.g., .doge, .oifi).


Determine First Instance:

- Compare inscription numbers to identify the first valid instance of each name.


**Validating Namespaces**

Extract Namespace:

- Validate the content as JSON5.

Check required keys:

- p: Must be "dns".
- op: Must be "dns".
- ns: Must be a string.


Extract the ns field (e.g., doge).


Validation Steps:

- Ensure valid UTF-8 characters.
- Convert to lowercase.
- Confirm no periods (.) in the ns field.


Determine First Instance:

- The first inscription of a namespace (by inscription number) is the only valid instance.



Indexer Recommendations:

- Case Sensitivity: Always query and store names/namespaces as lowercase to avoid duplicates.
- UTF-8 Handling: Return decoded UTF-8 names in API responses to help clients detect deceptive names (e.g., hidden characters).
- API Integration: Use an indexer like https://ordifind.com/names for querying DNS data. Ensure queries with special characters (e.g., #, ?) are URL-encoded.

*Example Commands:*

```
Deploy a Namespace:node . dns deploy doge "Names on Dogecoin." "e6c6efe91b6084eae2c8a2fd6470d3d0dbfbb342f1b8601904f45be8095058e2i0"
```

Output: Namespace TXID: 15f3b73df7e5c072becb1d84191843ba080734805addfccb650929719080f62e
Simple Name Registration:node . dns reg jared.doge

Output: Name TXID: def456...
Advanced Name Registration:node . dns reg jared.doge "e6c6efe91b6084eae2c8a2fd6470d3d0dbfbb342f1b8601904f45be8095058e2i0" "D9UcJkdirVLY11UtF77WnC8peg6xRYsogu" "f3b2c4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2i0"

Output: Name TXID: abc123...



*Notes:*

- Experimental Features: avatar, rev, and relay fields are experimental and require adoption by explorers and applications.
- First is First: The DNS protocol enforces that only the first inscription of a name or namespace is valid, ensuring uniqueness.
- Community Adoption: Encourage marketplaces (e.g., DoggyMarket, DogeLabs) and indexers (e.g., wonky, DoginalHub) to support DNS for enhanced discoverability.
-Future Enhancements: The doginals.js script may add more DNS-specific commands as the protocol evolves.
