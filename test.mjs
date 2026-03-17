import { getNameParts, escapeHtml } from './modules/utils.js';

function assert(condition, message) {
    if (!condition) {
        throw new Error(`Assertion failed: ${message}`);
    }
}

function testGetNameParts() {
    console.log("Running testGetNameParts...");
    
    let res = getNameParts("Max Mustermann");
    assert(res.firstName === "Max", "Max check");
    assert(res.lastName === "Mustermann", "Mustermann check");

    res = getNameParts("John Doe Smith");
    assert(res.firstName === "John", "John check");
    assert(res.lastName === "Doe Smith", "Doe Smith check");

    res = getNameParts("SingleName");
    assert(res.firstName === "SingleName", "SingleName check");
    assert(res.lastName === "", "Empty lastName check");

    res = getNameParts("");
    assert(res.firstName === "", "Empty firstName check");
    assert(res.lastName === "", "Empty lastName check");

    res = getNameParts(null);
    assert(res.firstName === "", "Null check");

    console.log("✅ testGetNameParts passed!");
}

function testEscapeHtml() {
    console.log("Running testEscapeHtml...");

    assert(escapeHtml("<script>") === "&lt;script&gt;", "Script tag escape");
    assert(escapeHtml("John & Doe") === "John &amp; Doe", "Ampersand escape");
    assert(escapeHtml(null) === "", "Null check");

    console.log("✅ testEscapeHtml passed!");
}

try {
    testGetNameParts();
    testEscapeHtml();
    console.log("\nAll tests passed successfully! 🚀");
} catch (error) {
    console.error(`\n❌ Tests failed: ${error.message}`);
    process.exit(1);
}
