/*
 * bookmarklet.c - JavaScript Minifier for Bookmarklets
 *
 * This program reads JavaScript source code and outputs a minified version
 * prefixed with "javascript:" for use as a browser bookmarklet.
 *
 * Features:
 *   - Removes single-line comments (//)
 *   - Removes multi-line comments
 *   - Collapses whitespace (multiple spaces/newlines become single space)
 *   - Preserves string literals (single, double, and template strings)
 *   - Preserves regex literals
 *   - Outputs bookmarklet-ready URL format
 *
 * Usage:
 *   ./bookmarklet script.js          # Read from file
 *   cat script.js | ./bookmarklet    # Read from stdin
 *
 * Example:
 *   Input:  function hello() { // greeting\n    console.log("hi");\n }
 *   Output: javascript:function hello(){console.log("hi");}
 */

#include <stdio.h>
#include <stdlib.h>
#include <ctype.h>
#include <stdbool.h>

/*
 * Parser states for the finite state machine.
 * The minifier tracks what context it's in to handle each character correctly.
 */
typedef enum {
    STATE_NORMAL,          /* Regular code - whitespace can be collapsed */
    STATE_STRING_SINGLE,   /* Inside single-quoted string: 'text' */
    STATE_STRING_DOUBLE,   /* Inside double-quoted string: "text" */
    STATE_STRING_TEMPLATE, /* Inside template literal: `text` */
    STATE_LINE_COMMENT,    /* Inside single-line comment: // ... */
    STATE_BLOCK_COMMENT,   /* Inside multi-line comment */
    STATE_REGEX            /* Inside regex literal: /pattern/ */
} State;

/*
 * Determines if a forward slash should be interpreted as the start of a regex.
 *
 * In JavaScript, '/' can mean division or regex. It's a regex when preceded by:
 *   - Opening tokens: ( , = : [ ! & | ? { }
 *   - Statement terminators: ; or newline
 *   - Start of input (last_token == 0)
 *
 * Examples:
 *   x = /foo/      -> regex (preceded by =)
 *   x / y          -> division (preceded by identifier)
 *   if (/foo/)     -> regex (preceded by ()
 */
bool is_before_regex(int last_token) {
    return last_token == '(' || last_token == ',' || last_token == '=' ||
           last_token == ':' || last_token == '[' || last_token == '!' ||
           last_token == '&' || last_token == '|' || last_token == '?' ||
           last_token == '{' || last_token == '}' || last_token == ';' ||
           last_token == '\n' || last_token == 0;
}

int main(int argc, char *argv[]) {
    FILE *input = stdin;

    /* Open file if provided as argument, otherwise read from stdin */
    if (argc > 1) {
        input = fopen(argv[1], "r");
        if (!input) {
            fprintf(stderr, "Error: Cannot open file %s\n", argv[1]);
            return 1;
        }
    }

    State state = STATE_NORMAL;
    int c;                      /* Current character being processed */
    int prev = 0;               /* Previous character (for escape detection) */
    int last_output = 0;        /* Last character output (for space insertion) */
    int last_token = 0;         /* Last significant token (for regex detection) */
    bool need_space = false;    /* Deferred space needed between tokens */
    bool line_start = true;     /* At start of line (suppress leading space) */

    /* Output the bookmarklet URL prefix */
    printf("javascript:");

    /*
     * Main parsing loop - process each character through the state machine.
     * Characters are either output, suppressed, or trigger state transitions.
     */
    while ((c = fgetc(input)) != EOF) {
        switch (state) {
            case STATE_NORMAL:
                /*
                 * Handle forward slash - could be:
                 *   //  -> line comment (suppress until newline)
                 *   / * -> block comment (suppress until closing)
                 *   /x  -> regex literal (preserve contents)
                 *   /   -> division operator (output as-is)
                 */
                if (c == '/' && prev != '\\') {
                    int next = fgetc(input);
                    if (next == '/') {
                        /* Start of line comment - suppress all until newline */
                        state = STATE_LINE_COMMENT;
                        break;
                    } else if (next == '*') {
                        /* Start of block comment - suppress all until */
                        state = STATE_BLOCK_COMMENT;
                        break;
                    } else if (is_before_regex(last_token)) {
                        /* Start of regex literal - preserve contents */
                        state = STATE_REGEX;
                        putchar(c);
                        if (next != EOF) {
                            putchar(next);
                            prev = next;
                        }
                        last_token = 0;
                        line_start = false;
                        break;
                    } else {
                        /* Division operator - put back the lookahead char */
                        if (next != EOF) ungetc(next, input);
                    }
                }

                /*
                 * Handle string literals - enter appropriate string state.
                 * All content inside strings is preserved exactly.
                 */
                if (c == '\'' && prev != '\\') {
                    state = STATE_STRING_SINGLE;
                    putchar(c);
                    last_token = c;
                    line_start = false;
                } else if (c == '"' && prev != '\\') {
                    state = STATE_STRING_DOUBLE;
                    putchar(c);
                    last_token = c;
                    line_start = false;
                } else if (c == '`') {
                    state = STATE_STRING_TEMPLATE;
                    putchar(c);
                    last_token = c;
                    line_start = false;
                } else if (isspace(c)) {
                    /*
                     * Whitespace handling:
                     * - Leading whitespace (line_start) is suppressed
                     * - Trailing whitespace after non-space is deferred
                     * - Multiple spaces collapse to one (handled in else branch)
                     */
                    if (!line_start && prev && !isspace(prev)) {
                        need_space = true;
                    }
                } else {
                    /*
                     * Regular character output:
                     * - Insert deferred space only if needed between alphanumerics
                     *   (e.g., "var x" needs space, "x+" does not)
                     * - Track as last token for regex detection
                     */
                    if (need_space && isalnum(c) && isalnum(last_output)) {
                        putchar(' ');
                    }
                    need_space = false;
                    putchar(c);
                    last_output = c;
                    last_token = c;
                    line_start = false;
                }
                break;

            case STATE_STRING_SINGLE:
                /* Inside 'single quoted string' - output everything */
                putchar(c);
                /* Exit on unescaped closing quote */
                if (c == '\'' && prev != '\\') {
                    state = STATE_NORMAL;
                    last_token = c;
                }
                break;

            case STATE_STRING_DOUBLE:
                /* Inside "double quoted string" - output everything */
                putchar(c);
                /* Exit on unescaped closing quote */
                if (c == '"' && prev != '\\') {
                    state = STATE_NORMAL;
                    last_token = c;
                }
                break;

            case STATE_STRING_TEMPLATE:
                /* Inside `template literal` - escape newlines to keep on one line */
                if (c == '\n') {
                    /* Convert literal newline to \n escape sequence */
                    putchar('\\');
                    putchar('n');
                } else {
                    putchar(c);
                }
                /* Exit on unescaped closing backtick */
                if (c == '`' && prev != '\\') {
                    state = STATE_NORMAL;
                    last_token = c;
                }
                break;

            case STATE_LINE_COMMENT:
                /* Inside // comment - suppress all characters */
                if (c == '\n') {
                    /* Newline ends the comment */
                    state = STATE_NORMAL;
                    line_start = true;
                }
                break;

            case STATE_BLOCK_COMMENT:
                /* Inside block comment - suppress all characters */
                if (c == '/' && prev == '*') {
                    /* Star-slash sequence ends the comment */
                    state = STATE_NORMAL;
                }
                break;

            case STATE_REGEX:
                /* Inside /regex/ - output everything */
                putchar(c);
                /* Exit on unescaped closing slash */
                if (c == '/' && prev != '\\') {
                    state = STATE_NORMAL;
                    last_token = c;
                }
                break;
        }

        prev = c;
    }

    /* Terminate output with newline */
    putchar('\n');

    if (input != stdin) {
        fclose(input);
    }

    return 0;
}
