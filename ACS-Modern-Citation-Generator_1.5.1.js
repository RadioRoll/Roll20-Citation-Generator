/*
 * AUTOMATED CITATION SYSTEM v1.5.1
 * Roll20 Mod / API Script
 *
 * COMMANDS
 * !cite       - Open GM citation terminal
 * !citehelp   - Display instructions
 *
 * STORAGE
 * Individual handouts contain citation records.
 * One master register handout contains the index.
 * API state stores ONLY the next citation number.
 *
 * REFERANCE
 * 01 - Colours, buttons and chat styling
 * 02 - Citation prompts and handout lookups
 * 03 - Main menu and help
 * 04 - Printed e-paper citation design
 * 05 - Master register handout
 * 06 - Issue a citation
 * 07 - Manage, pay and cancel
 * 08 - Roll20 commands and startup
 *
 * All chat button rows use C.centerButtons().
 * Help text remains left-aligned.
 */

var CyberCitation = CyberCitation || {};

(function (C) {
    'use strict';

    var PAPER = '#C6B56A';
    var INK = '#29251B';
    var REGISTER = 'ACS — MASTER CITATION REGISTER';
    var buildVersion = 0;

    C.VERSION = '1.5.1';

    // ============================================================
    // 01 - COLOURS, BUTTONS AND CHAT STYLING
    // ============================================================

    C.esc = function (s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    };

    C.whisper = function (id, html) {
        var p = getObj('player', id);
        var name = p ? p.get('_displayname') : 'gm';

        sendChat(
            'ACS',
            '/w "' +
            String(name).replace(/["\r\n]/g, '') +
            '" ' + html
        );
    };

    // Main e-paper panel for chat messages.
    C.paper = function (title, content) {
        return '<div style="' +
            'background:' + PAPER + ';' +
            'color:' + INK + ';' +
            'border:2px solid ' + INK + ';' +
            'padding:7px;' +
            'font-family:monospace;' +
            'font-size:11px;' +
            'line-height:1.5;">' +

            '<div style="' +
            'border-bottom:2px solid ' + INK + ';' +
            'text-align:center;' +
            'font-weight:bold;' +
            'padding-bottom:4px;' +
            'margin-bottom:6px;">' +
            C.esc(title) +
            '</div>' +

            content +
            '</div>';
    };

    // Edit this function to change ALL button appearances.
    C.button = function (label, href) {
        return '<a href="' + C.esc(href) + '" style="' +
            'display:inline-block;' +
            'background:' + INK + ';' +
            'color:' + PAPER + ';' +
            'border:1px solid ' + INK + ';' +
            'border-radius:1px;' +
            'padding:1px 5px;' +
            'margin:2px;' +
            'text-decoration:none;' +
            'font-size:10px;' +
            'font-weight:bold;">' +
            C.esc(label) +
            '</a>';
    };

    // Centre buttons without centring surrounding text.
    C.centerButtons = function (html) {
        return '<div style="text-align:center;margin:5px 0;">' +
            html +
            '</div>';
    };

    // Direct link to an individual Roll20 handout.
    C.link = function (h, label) {
        return C.button(
            label,
            'https://journal.roll20.net/handout/' + h.id
        );
    };

    C.note = function (id, message) {
        C.whisper(
            id,
            C.paper('ACS NOTICE', C.esc(message))
        );
    };

    // ============================================================
    // 02 - CITATION PROMPTS AND HANDOUT LOOKUPS
    // ============================================================

    // Roll20's seven interactive citation prompts.
    C.issueQuery = function () {
        return '!cite issue ' +
            '?{Registered Name}~' +
            '?{Citation Title|Traffic Violation}~' +
            '?{Issuing Agency|NCPD}~' +
            '?{Offense}~' +
            '?{Location}~' +
            '?{Fine|100}~' +
            '?{Date}';
    };

    // Find the master register handout.
    C.getRegister = function () {
        return findObjs({ type: 'handout' }).filter(
            function (h) {
                return h.get('name') === REGISTER;
            }
        )[0];
    };

    // Find all ACS citation handouts.
    C.tickets = function () {
        return findObjs({ type: 'handout' }).filter(
            function (h) {
                return /^ACS-\d+\s+(?:—|\|)/.test(
				h.get('name') || ''
				);
            }
        );
    };

    // Get ACS-0001 etc. from a handout name.
    C.serial = function (h) {
        return String(h.get('name'))
            .match(/^(ACS-\d+)/)[1];
    };

    // Find a citation using its printed serial.
    // No internal Roll20 handout ID is needed.
    C.find = function (serial) {
        serial = String(serial || '')
            .trim()
            .toUpperCase();

        return C.tickets().filter(
            function (h) {
                return C.serial(h) === serial;
            }
        )[0];
    };

    // Extract the issuing agency from the handout title.
    C.agency = function (h) {
        var match = String(h.get('name')).match(
		/^ACS-\d+\s+(?:—|\|)\s+\[([^\]]+)\]/
	);

        return match ? match[1] : 'OLDER ACS RECORDS';
    };

    // Read payment status from the citation's actual notes.
    C.status = function (notes) {
        var m = String(notes || '')
            .replace(/<[^>]*>/g, '')
            .match(
                /STATUS:\s*(OUTSTANDING|PAID|CANCELLED)/i
            );

        return m ? m[1].toUpperCase() : 'UNKNOWN';
    };

    // ============================================================
    // 03 - MAIN MENU AND HELP
    // ============================================================

    C.menu = function (id) {
        if (!playerIsGM(id)) {
            return C.note(id, 'GM access required.');
        }

        var r = C.getRegister();

        C.whisper(
            id,
            C.paper(
                'AUTOMATED CITATION SYSTEM',

                C.centerButtons(
                    C.button('ISSUE', C.issueQuery()) +

                    (r
                        ? C.link(r, 'REGISTER')
                        : C.button(
                            'REGISTER',
                            '!cite refresh'
                        )
                    ) +

                    C.button(
                        'MANAGE',
                        '!cite manage ?{Citation ID|ACS-0001}'
                    )
                ) +

                '<div style="' +
                'border-top:1px solid ' + INK + ';' +
                'padding-top:4px;' +
                'margin-top:5px;' +
                'text-align:center;">' +
                '!citehelp — INSTRUCTIONS' +
                '</div>'
            )
        );
    };

    C.help = function (id) {
        C.whisper(
            id,
            C.paper(
                'ACS — OPERATING INSTRUCTIONS',

                '<b>!cite</b> opens the GM terminal.<br>' +
                '<b>!citehelp</b> opens this guide.<br>' +

                '<b>ISSUE:</b> Answer seven prompts. ' +
                'Creates a numbered ticket, prints it to chat, ' +
                'and updates the register.<br>' +

                '<b>REGISTER:</b> Opens one GM-only handout ' +
                'containing direct links to citations, ' +
                'grouped by issuing agency.<br>' +

                '<b>MANAGE:</b> Enter the printed serial ' +
                '(e.g. ACS-0025); choose OPEN, PAY or CANCEL. ' +
                'No Roll20 handout ID needed.<br>' +

                '<b>PAY / CANCEL:</b> GM-only; each requires ' +
                'confirmation. Updates the original handout ' +
                'and register. No character money changes.<br>' +

                '<b>STORAGE:</b> Ticket data lives only in ' +
                'ticket handouts; the register is a rebuildable ' +
                'list of links. API state stores only the ' +
                'next serial number.<br>' +

                '<b>ACCESS:</b> Matching character-sheet ' +
                'controllers can view their ticket; the ' +
                'register and management controls are GM-only.<br>' +

                '<b>OPTIONAL:</b> !cite refresh regenerates ' +
                'the register after manual handout deletion ' +
                'or renaming.<br>' +

                C.centerButtons(
                    C.button('BACK', '!cite')
                )
            )
        );
    };

    // ============================================================
    // 04 - PRINTED E-PAPER CITATION DESIGN
    // ============================================================

    // This function controls the physical ticket appearance.
    // It retains the original two-tone printed layout.

    C.print = function (d) {
        var e = C.esc;

        var wrapped = (
            e(d.offense).match(
                /.{1,28}(?:\s|$)|\S{1,28}/g
            ) || ['']
        ).map(function (t, i) {
            return (i ? '║                ' : '') +
                t.trim();
        }).join('\n');

        return '<pre style="' +
            'font-family:monospace;' +
            'font-size:11px;' +
            'line-height:1.35;' +
            'white-space:pre;' +
            'display:inline-block;' +
            'width:305px;' +
            'min-width:305px;' +
            'max-width:305px;' +
            'box-sizing:border-box;' +
            'overflow-x:auto;' +
            'margin:0;' +
            'padding:10px;' +
            'background-color:#C6B56A;' +
            'color:#29251B;">' +

            '╔══════════════════════════════════════════╗ █████\n' +
            '║ ' + e(d.agency).toUpperCase() + '\n' +
            '║ ' + e(d.title).toUpperCase() + '\n' +
            '║ AUTOMATED CITATION SYSTEM                ║ █████\n' +
            '╠══════════════════════════════════════════╣ ▓▓▓▓▓\n' +
            '║ CITATION NO: ' + e(d.number) + '\n' +
            '╠══════════════════════════════════════════╣ ▒▒▒▒▒\n' +
            '║ REGISTERED TO: ' + e(d.name) + '\n' +
            '║ DATE:          ' + e(d.date) + '\n' +
            '║ LOCATION:      ' + e(d.location) + '\n' +
            '║ OFFENSE:       ' + wrapped + '\n' +
            '╠══════════════════════════════════════════╣ - - -\n' +
            '║ TOTAL DUE:     €$ ' + e(d.fine) + '\n' +
            '║ STATUS: ' + e(d.status || 'OUTSTANDING') + '\n' +
            '╠══════════════════════════════════════════╣ - - -\n' +
            '║ NOTICE TO REGISTERED PARTY               ║ █████\n' +
            '║ Payment is required within 4 standard    ║ ▒▒▒▒▒\n' +
            '║ Weeks. Failure to remit may result in    ║ ░░░░░\n' +
            '║ additional penalties, vehicle seizure,   ║  ┃ ┃ \n' +
            '║ or contracted debt recovery.             ║ ┃ ┃ ┃\n' +
            '╠══════════════════════════════════════════╣      \n' +
            '║ THIS NOTICE WAS GENERATED AUTOMATICALLY. ║ ░░░░░\n' +
            '║ DISPUTES WILL BE PROCESSED IN ORDER OF   ║ ▒▒▒▒▒\n' +
            '║ RECEIPT. ESTIMATED WAIT: 6–8 YEARS.      ║ ▓▓▓▓▓\n' +
            '╚══════════════════════════════════════════╝ █████\n' +
            '       END OF MUNICIPAL NOTICE\n' +
            '</pre>';
    };

    // ============================================================
    // 05 - MASTER REGISTER HANDOUT
    // ============================================================

    // Reads existing ticket handouts and rebuilds the index.
    // Records are not duplicated in persistent API state.
    // Groups tickets by issuing body, then citation number.

    C.refresh = function () {
        var tickets = C.tickets();
        var version = ++buildVersion;
        var rows = [];
        var remaining = tickets.length;

        function finish() {
            if (version !== buildVersion) return;

            rows.sort(function (a, b) {
                return a.agency.localeCompare(b.agency) ||
                    b.num - a.num;
            });

            var html =
                '<div style="' +
                'background:' + PAPER + ';' +
                'color:' + INK + ';' +
                'padding:12px;' +
                'font:12px monospace;">' +

                '<div style="' +
                'text-align:center;' +
                'border-bottom:2px solid ' + INK + ';' +
                'padding:5px;' +
                'font-weight:bold;">' +
                'ACS — MASTER CITATION REGISTER' +
                '</div>';

            var last = null;

            rows.forEach(function (r) {
                if (last !== r.agency) {
                    last = r.agency;

                    html +=
                        '<div style="' +
                        'border-bottom:1px solid ' + INK + ';' +
                        'margin-top:12px;' +
                        'font-weight:bold;">' +
                        C.esc(last) +
                        '</div>';
                }

                html +=
                    '<div style="padding:3px 0;">' +
                    C.link(r.h, r.serial) +
                    ' ' + C.esc(r.status) +
                    ' — ' + C.esc(r.label) +
                    '</div>';
            });

            html += (
                rows.length
                    ? ''
                    : '<p>NO CITATIONS ON RECORD</p>'
            ) + '</div>';

            var register = C.getRegister();

            if (register) {
                register.set('notes', html);
            } else {
                createObj('handout', {
                    name: REGISTER,
                    inplayerjournals: '',
                    archived: false,
                    notes: html
                });
            }
        }

        if (!remaining) return finish();

        tickets.forEach(function (h) {
            h.get('notes', function (notes) {
                var match = String(h.get('name')).match(
				/^ACS-\d+\s+(?:—|\|)\s+(?:\[[^\]]+\]\s+(?:—|\|)\s+)?(.*)$/
		);

                rows.push({
                    h: h,
                    serial: C.serial(h),
                    num: Number(C.serial(h).slice(4)),
                    agency: C.agency(h),
                    label: match ? match[1] : h.get('name'),
                    status: C.status(notes)
                });

                if (!--remaining) finish();
            });
        });
    };

    // ============================================================
    // 06 - ISSUE A NEW CITATION
    // ============================================================

    C.issue = function (id, args) {
        if (!playerIsGM(id)) {
            return C.note(id, 'GM access required.');
        }

        var a = String(args || '').split('~');

        if (a.length < 7) {
            return C.note(
                id,
                'Missing fields. Choose ISSUE from !cite.'
            );
        }

        var d = {
            name: a[0].trim(),
            title: a[1].trim() || 'Traffic Violation',
            agency: a[2].trim() || 'NCPD',
            offense: a[3].trim(),
            location: a[4].trim(),
            fine: a[5].trim(),
            date: a.slice(6).join('~').trim()
        };

        var fine = Number(d.fine);

        if (
            !d.name ||
            !d.offense ||
            !d.location ||
            !d.date ||
            !Number.isFinite(fine) ||
            fine < 0 ||
            fine > 100000000
        ) {
            return C.note(
                id,
                'Name, offense, location, date and a ' +
                'valid nonnegative fine are required.'
            );
        }

        // Find matching character for handout access.
        var ch = findObjs({ type: 'character' }).filter(
            function (c) {
                return String(c.get('name') || '')
                    .trim()
                    .toLowerCase() === d.name.toLowerCase();
            }
        )[0];

        var access = ch
            ? String(ch.get('controlledby') || '')
            : '';

        // Continue existing numbering across versions.
        // Never reuse an existing ACS serial.
        while (
            C.find(
                'ACS-' +
                String(
                    state.CyberCitation.nextNumber
                ).padStart(4, '0')
            )
        ) {
            state.CyberCitation.nextNumber++;
        }

        d.number = 'ACS-' +
            String(
                state.CyberCitation.nextNumber
            ).padStart(4, '0');

        d.fine = fine.toLocaleString('en-US');

        // Store citation data in its own handout.
        var h = createObj('handout', {
            name: d.number +
				' | [' +
				d.agency.replace(/[\[\]]/g, '') +
				'] | ' +
				d.title +
				' | ' +
				d.name,

            inplayerjournals: access,
            archived: false,
            notes: C.print(d)
        });

        if (!h) {
            return C.note(
                id,
                'Could not create handout.'
            );
        }

        state.CyberCitation.nextNumber++;

        // Print the ticket publicly, with centred link.
        sendChat(
            'ACS',
            C.print(d) +
            C.centerButtons(
                C.link(h, 'OPEN CITATION')
            )
        );

        // Automatically update master register.
        C.refresh();
    };

    // ============================================================
    // 07 - MANAGE, PAY AND CANCEL
    // ============================================================

    // MANAGE accepts human-readable ACS serials,
    // not internal Roll20 handout IDs.

    C.manage = function (id, serial) {
        if (!playerIsGM(id)) {
            return C.note(id, 'GM access required.');
        }

        var h = C.find(serial);

        if (!h) {
            return C.note(
                id,
                'Citation not found. Enter a serial ' +
                'such as ACS-0025.'
            );
        }

        h.get('notes', function (notes) {
            var status = C.status(notes);
            var n = C.serial(h);

            C.whisper(
                id,
                C.paper(
                    'MANAGE — ' + n,

                    'STATUS: <b>' +
                    C.esc(status) +
                    '</b><br>' +

                    C.centerButtons(
                        C.link(h, 'OPEN') +

                        (
                            status === 'OUTSTANDING'
                                ? C.button(
                                    'PAY',
                                    '!cite confirm-pay ' + n
                                ) +
                                C.button(
                                    'CANCEL',
                                    '!cite confirm-cancel ' + n
                                )
                                : ''
                        ) +

                        C.button('BACK', '!cite')
                    )
                )
            );
        });
    };

    // First click requests confirmation.
    // Second click applies the status change.
    C.change = function (id, action, serial, confirmed) {
        if (!playerIsGM(id)) {
            return C.note(id, 'GM access required.');
        }

        var h = C.find(serial);

        if (!h) {
            return C.note(id, 'Citation not found.');
        }

        h.get('notes', function (notes) {
            if (C.status(notes) !== 'OUTSTANDING') {
                return C.note(
                    id,
                    'Citation is no longer outstanding.'
                );
            }

            if (!confirmed) {
                return C.whisper(
                    id,
                    C.paper(
                        'CONFIRM — ' + C.serial(h),

                        'MARK AS ' +
                        (
                            action === 'pay'
                                ? 'PAID'
                                : 'CANCELLED'
                        ) +
                        '?<br>' +

                        C.centerButtons(
                            C.button(
                                'CONFIRM',
                                '!cite apply-' +
                                action + ' ' +
                                C.serial(h)
                            ) +

                            C.button(
                                'BACK',
                                '!cite manage ' +
                                C.serial(h)
                            )
                        )
                    )
                );
            }

            var newStatus = action === 'pay'
                ? 'PAID'
                : 'CANCELLED';

            var updated = String(notes).replace(
                /STATUS:\s*OUTSTANDING/i,
                'STATUS: ' + newStatus
            );

            // Change status in original handout.
            h.set('notes', updated);

            // Refresh index to reflect new status.
            C.refresh();

            C.whisper(
                id,
                C.paper(
                    'UPDATED — ' + C.serial(h),

                    'STATUS: <b>' +
                    newStatus +
                    '</b><br>' +

                    C.centerButtons(
                        C.link(h, 'OPEN') +
                        C.button('BACK', '!cite')
                    )
                )
            );
        });
    };

    // ============================================================
    // 08 - ROLL20 COMMANDS AND STARTUP
    // ============================================================

    on('ready', function () {

        // Preserve existing citation numbering.
        state.CyberCitation =
            state.CyberCitation || { nextNumber: 1 };

        if (
            !Number.isFinite(
                state.CyberCitation.nextNumber
            ) ||
            state.CyberCitation.nextNumber < 1
        ) {
            state.CyberCitation.nextNumber = 1;
        }

        on('chat:message', function (msg) {
            if (msg.type !== 'api') return;

            // Separate help command.
            if (/^!citehelp\s*$/i.test(msg.content)) {
                return C.help(msg.playerid);
            }

            // Ignore commands belonging to other scripts.
            if (!/^!cite(?:\s|$)/i.test(msg.content)) {
                return;
            }

            var rest = msg.content
                .replace(/^!cite\s*/i, '')
                .trim();

            var space = rest.indexOf(' ');

            var cmd = (
                space < 0
                    ? rest
                    : rest.slice(0, space)
            ).toLowerCase();

            var arg = (
                space < 0
                    ? ''
                    : rest.slice(space + 1)
            ).trim();

            // Main menu
            if (!cmd) {
                return C.menu(msg.playerid);
            }

            // Help
            if (cmd === 'help') {
                return C.help(msg.playerid);
            }

            // Issue ticket
            if (cmd === 'issue') {
                return C.issue(msg.playerid, arg);
            }

            // Manage ticket by ACS serial
            if (cmd === 'manage') {
                return C.manage(msg.playerid, arg);
            }

            // Rebuild register manually
            if (cmd === 'refresh') {
                if (!playerIsGM(msg.playerid)) return;

                C.refresh();
                return C.menu(msg.playerid);
            }

            // Payment/cancellation confirmation
            if (
                cmd === 'confirm-pay' ||
                cmd === 'confirm-cancel'
            ) {
                return C.change(
                    msg.playerid,
                    cmd.slice(8),
                    arg,
                    false
                );
            }

            // Apply confirmed payment/cancellation
            if (
                cmd === 'apply-pay' ||
                cmd === 'apply-cancel'
            ) {
                return C.change(
                    msg.playerid,
                    cmd.slice(6),
                    arg,
                    true
                );
            }

            C.note(
                msg.playerid,
                'Unknown command. Use !citehelp.'
            );
        });

        // Create register if it doesn't exist.
        // Existing register is preserved on restart.
        if (!C.getRegister()) {
            C.refresh();
        }
    });

}(CyberCitation));
