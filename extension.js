const vscode = require("vscode");

/*
settings.json
	"frogger.insertCursorBeforeByDefault"
	"frogger.selectToMatchByDefault"
	"frogger.searchBackwardsByDefault"
	"frogger.copyToClipboardOnSelect"
	"frogger.wrapSearch"
*/

const SETTING_NAMES = {
    insertCursorBefore: "frogger.insertCursorBefore",
    insertCursorBeforeByDefault: "frogger.insertCursorBeforeByDefault",
    selectToMatch: "frogger.selectToMatch",
    selectToMatchByDefault: "frogger.selectToMatchByDefault",
    copyToClipboardOnSelect: "frogger.copyToClipboardOnSelect",
    searchBackwards: "frogger.searchBackwards",
    searchBackwardsByDefault: "frogger.searchBackwardsByDefault",
	lastSearchTerm: "frogger.lastSearchTerm",
};

const COMMANDS = {
    toggleInsertCursor: "frogger.toggleInsertCursor",
    toggleSelectToMatch: "frogger.toggleSelectToMatch",
    toggleSearchBackwards: "frogger.toggleSearchBackwards",

    jump: "frogger.jump",
    /*
		add commands to start these functions with specific settings, regardless of state or defaults

		- command to jump to the typed letter
			- "frogger.jump"
		- command to jump to the next occurence of the prev search
			- "frogger.jumpToNext"
		- command to jump to the prev occurence of the prev search
			- "frogger.jumpToPrev"
		- command to jump with selecting already selected
			- "frogger.jumpSelect"
		- command to jump with backwards already selected
			- "frogger.jumpBackwards"
		- command to jump with insertCursorBeforeMatch set to true
			- "frogger.jumpTo"
		- command to jump with insertCursorBeforeMatch set to false
			- "frogger.jumpAfter"
		- command to jump to first occurence from top of file
			- "frogger.jumpFromTop"
		- command to jump to first occurence from bottom of file
			- "frogger.jumpFromBottom"
		- command to toggle all variables
	*/
};

const CONTEXTS = {
    froggerIsViewable: "FroggerIsViewable",
};

const BUTTONS = {
    close: {
        id: "close",
        icon: "close",
        tooltip: "Close (Escape)",
    },
    insert: {
        id: "insert",
        icons: {
            true: "triangle-left",
            false: "triangle-right",
        },
        tip: {
            true: "Insert Cursor Before",
            false: "Insert Cursor After",
        },
        key: "⌘I",
    },
    select: {
        id: "select",
        icons: {
            true: "pencil",
            false: "whole-word",
        },
        tip: {
            true: "Select to Match",
            false: "Jump to Match",
        },
        key: "⌘L",
    },
    searchBackwards: {
        id: "searchBackwards",
        icons: {
            true: "arrow-left",
            false: "arrow-right",
        },
        tip: {
            true: "Search Backwards",
            false: "Search Forwards",
        },
        key: "⌘K",
    },
};

function activate(context) {
    // |-------------------------|
    // |        Settings         |
    // |-------------------------|

    function createDefaultSetting(settingName) {
        return vscode.workspace.getConfiguration().get(settingName, false);
    }
    function updateGlobalState(settingName, value) {
        context.globalState.update(settingName, value);
    }
    function getGlobalState(settingName, settingDefault) {
        return context.globalState.get(settingName, settingDefault);
    }

    //   insertCursor setting
    // ------------------------
    const insertCursorBeforeDefault = createDefaultSetting(
        SETTING_NAMES.insertCursorBeforeByDefault
    );
    updateGlobalState(
        SETTING_NAMES.insertCursorBefore,
        insertCursorBeforeDefault
    );

    //   select setting
    // ------------------
    const selectToMatchDefault = createDefaultSetting(
        SETTING_NAMES.selectToMatchByDefault
    );
    updateGlobalState(SETTING_NAMES.selectToMatch, selectToMatchDefault);

    //   search backwards setting
    // ----------------------------
    const searchBackwardsDefault = createDefaultSetting(
        SETTING_NAMES.selectToMatchByDefault
    );
    updateGlobalState(SETTING_NAMES.searchBackwards, selectToMatchDefault);

    function getAllGlobalState() {
        return {
            insertCursorBefore: getGlobalState(
                SETTING_NAMES.insertCursorBefore,
                insertCursorBeforeDefault
            ),
            selectToMatch: getGlobalState(
                SETTING_NAMES.selectToMatch,
                selectToMatchDefault
            ),
            searchBackwards: getGlobalState(
                SETTING_NAMES.searchBackwards,
                searchBackwardsDefault
            ),
        };
    }

    // |-------------------------|
    // |        create UI        |
    // |-------------------------|

    function createButtons() {
        const { insertCursorBefore, selectToMatch, searchBackwards } =
            getAllGlobalState();

        return [
            {
                id: BUTTONS.searchBackwards.id,
                iconPath: new vscode.ThemeIcon(
                    BUTTONS.searchBackwards.icons[searchBackwards]
                ),
                tooltip: createTooltip(
                    BUTTONS.searchBackwards,
                    searchBackwards
                ),
            },
            {
                id: BUTTONS.insert.id,
                iconPath: new vscode.ThemeIcon(
                    BUTTONS.insert.icons[insertCursorBefore]
                ),
                tooltip: createTooltip(BUTTONS.insert, insertCursorBefore),
            },
            {
                id: BUTTONS.select.id,
                iconPath: new vscode.ThemeIcon(
                    BUTTONS.select.icons[selectToMatch]
                ),
                tooltip: createTooltip(BUTTONS.select, selectToMatch),
            },
            {
                id: BUTTONS.close.id,
                iconPath: new vscode.ThemeIcon(BUTTONS.close.icon),
                tooltip: BUTTONS.close.tooltip,
            },
        ];
    }

    //   Input Box
    // -------------

    const inputBox = vscode.window.createInputBox();
    inputBox.placeholder = "Enter a character to jump to ...";
    inputBox.prompt = "";
    inputBox.title = "🐸";
    inputBox.buttons = createButtons();

    inputBox.onDidTriggerButton((button) => {
        switch (button.id) {
            case BUTTONS.insert.id:
                vscode.commands.executeCommand(COMMANDS.toggleInsertCursor);
                break;
            case BUTTONS.select.id:
                vscode.commands.executeCommand(COMMANDS.toggleSelectToMatch);
                break;
            case BUTTONS.searchBackwards.id:
                vscode.commands.executeCommand(COMMANDS.toggleSearchBackwards);
                break;
            case BUTTONS.close.id:
                inputBox.hide();
                break;
        }
    });

    inputBox.onDidAccept(() => {
        inputBox.hide();
    });

    inputBox.onDidHide(() => {
        inputBox.value = "";
        setFroggerFocusContext(undefined);
        inputBox.hide();
    });

    inputBox.openBox = () => {
		highlightCurrentCharacter();
        setFroggerFocusContext(true);
        inputBox.show();
    };
    inputBox.storeSearchTerm = (searchTerm) => {
		updateGlobalState(SETTING_NAMES.lastSearchTerm, searchTerm)
        inputBox.prompt = `or jump to  ${searchTerm}  again!`;
    };

    // |---------------------------|
    // |        UI Commands        |
    // |---------------------------|

    const commands = [
        vscode.commands.registerCommand(COMMANDS.toggleInsertCursor, () => {
            // get the current global state and toggle the value
            const insertCursorBefore = !getGlobalState(
                SETTING_NAMES.insertCursorBefore,
                insertCursorBeforeDefault
            );
            // update the state
            updateGlobalState(
                SETTING_NAMES.insertCursorBefore,
                insertCursorBefore
            );
            // update the ui to reflect the new state
            inputBox.buttons = createButtons();
        }),

        vscode.commands.registerCommand(COMMANDS.toggleSelectToMatch, () => {
            const selectToMatch = !getGlobalState(
                SETTING_NAMES.selectToMatch,
                selectToMatchDefault
            );
            updateGlobalState(SETTING_NAMES.selectToMatch, selectToMatch);
            inputBox.buttons = createButtons();
        }),

        vscode.commands.registerCommand(COMMANDS.toggleSearchBackwards, () => {
            const searchBackwards = !getGlobalState(
                SETTING_NAMES.searchBackwards,
                searchBackwardsDefault
            );
            updateGlobalState(SETTING_NAMES.searchBackwards, searchBackwards);
            inputBox.buttons = createButtons();
        }),

        // |-------------------------------|
        // |        Search Commands        |
        // |-------------------------------|

        vscode.commands.registerCommand(COMMANDS.jump, () => {
            const { insertCursorBefore, selectToMatch, searchBackwards } =
                getAllGlobalState();

            inputBox.openBox();
            inputBox.onDidChangeValue((searchTerm) => {
                Jump(
                    searchTerm,
                    insertCursorBefore,
                    selectToMatch,
                    searchBackwards
                );
                inputBox.storeSearchTerm(searchTerm);
                inputBox.hide();
            });
        }),
        /*


		*/
    ]; // end of commands

    context.subscriptions.push(inputBox, ...commands);
    /*


	*/
} // end of activate()

function setWhenContext(key, value) {
    return vscode.commands.executeCommand("setContext", key, value);
}
function setFroggerFocusContext(value) {
    return setWhenContext(CONTEXTS.froggerIsViewable, value);
}
function createTooltip(buttonSettings, settingState) {
    return `${buttonSettings.tip[settingState]} (${buttonSettings.key})`;
}


// fix this shit
function highlightCurrentCharacter(){

	const editor = vscode.window.activeTextEditor;
	const cursorPosition = editor.selection.active;
	const cursorOffset = editor.document.positionAt(cursorPosition);
	const cursor = new vscode.Range(cursorOffset, cursorOffset+1)
	editor.selection = new vscode.Selection(cursor.start,cursor.end);

}

// |--------------------|
// |        Jump        |
// |--------------------|

function Jump(searchTerm, insertCursorBefore, selectToMatch, searchBackwards) {

    const editor = vscode.window.activeTextEditor;

    if (editor && searchTerm) {

        const document = editor.document;

        const text = document.getText();

        // escape any regex special characters
        searchTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

        const searchTermRegex = new RegExp(searchTerm, "g");

        const cursorPosition = editor.selection.active;
        const cursorOffset = document.offsetAt(cursorPosition);

        const allMatches = [];
        let match;
        while ((match = searchTermRegex.exec(text)) !== null) {
            const startPos = document.positionAt(match.index);
            const endPos = document.positionAt(match.index + match[0].length);
            allMatches.push(new vscode.Range(startPos, endPos));
        }

        const matchesBeforeCursor = allMatches.filter(
            (range) => document.offsetAt(range.start) < cursorOffset
        );
        const matchesAfterCursor = allMatches.filter(
            (range) => document.offsetAt(range.start) >= cursorOffset
        );

        // highlight all matches
        const matchesBeforeHighlight =
            vscode.window.createTextEditorDecorationType({
                backgroundColor: "rgba(0,255,0,0.4)", //green
            });
        const matchesAfterHighlight =
            vscode.window.createTextEditorDecorationType({
                backgroundColor: "rgba(255,0,0,0.4)", //red
            });
        editor.setDecorations(matchesBeforeHighlight, matchesBeforeCursor);
        editor.setDecorations(matchesAfterHighlight, matchesAfterCursor);

        let targetMatch;

        if (matchesAfterCursor.length > 0) {
            targetMatch = matchesAfterCursor[0];
        } else {
            const WrapSearch = vscode.workspace
                .getConfiguration()
                .get("frogger.wrapSearch", false);

            if (WrapSearch && matchesBeforeCursor.length > 0) {
                targetMatch = matchesBeforeCursor[0];
            } else {
                const SearchBackwardsIfNoMatch = vscode.workspace
                    .getConfiguration()
                    .get("frogger.searchBackwardsIfNoMatch", false);

                if (
                    SearchBackwardsIfNoMatch &&
                    matchesBeforeCursor.length > 0
                ) {
                    targetMatch =
                        matchesBeforeCursor[matchesBeforeCursor.length - 1];
                }
            }
        }

        // modify this function to accept a highlighting feature
        if (targetMatch) {
            const newPosition = insertCursorBefore
                ? targetMatch.start
                : targetMatch.end;

            // change this selection to include the old position if highlighting
            // if jumping with a previous search the old position should be passed from the original search
            // this will need to be stored in state
            editor.selection = new vscode.Selection(newPosition, newPosition);

            // make the reveal location editable from settings
            editor.revealRange(
                targetMatch,
                vscode.TextEditorRevealType.InCenter
            );
        }
    }
}

function deactivate() {}

module.exports = {
    activate,
    deactivate,
};
