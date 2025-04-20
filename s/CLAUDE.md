# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build/Compilation
- Compile C++ to JS with Emscripten: `emcc file.cpp -o file.js -s WASM=1 -s ASYNCIFY=1 -s "EXPORTED_FUNCTIONS=['_functionName']" -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","UTF8ToString"]' -s ALLOW_MEMORY_GROWTH=1 -s INITIAL_MEMORY=64MB -s ENVIRONMENT=web -s SINGLE_FILE=1 -O3 -ffast-math`
- Make modifications based on specific function exports needed

## Code Style
- Use snake_case for C++ variables and camelCase for JavaScript
- Indent with 4 spaces in C++, 2 spaces in JavaScript
- Include detailed comments for complex mathematical functions
- Use `inline` for small helper functions
- Use `std::complex<double>` for complex numbers in C++
- Keep lines under 100 characters when possible
- Math: respect variable naming conventions from papers

## Error Handling
- Use descriptive error messages
- Validate inputs at the start of functions (e.g., bounds checking)
- Use proper memory management (malloc/free) for C strings
- Free memory with `freeString()` after use

## Testing
- Test with varying parameter sizes
- Verify output against expected mathematical properties

## Access
- Never look into .js files, since they are generated from C++ code and are not for reading
- Most tasks are ONLY performed in .md files, not .cpp files or .js files
