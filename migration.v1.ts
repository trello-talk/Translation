// deno-lint-ignore-file no-explicit-any
// deno run  --allow-read --allow-write=./ migration.v1.ts

import InputLoop from 'https://deno.land/x/input@2.0.3/index.ts';
import * as path from "https://deno.land/std@0.118.0/path/mod.ts";
import chalkin from "https://deno.land/x/chalkin@v0.1.3/mod.ts";
import { lodash } from "https://cdn.skypack.dev/lodash-es@4.17.15";
const input = new InputLoop();

let langName = Deno.args[0] || await input.question('Enter the name of the lang file in "bot" to convert:');
if (langName === 'en_US' || langName === 'en_GB') {
  console.log(chalkin.red('You cannot convert the default lang file.'));
  Deno.exit(0);
}

const lang = JSON.parse(await Deno.readTextFile(path.join('bot', `${langName}.json`)));
if (langName === 'pt_BR') langName = 'pt-BR';

// Check for overwrites
try {
  await Deno.lstat(path.join('commands', `${langName}.json`));
  const overwrite = await input.question(chalkin.yellow('This language file already exists in "commands". Do you want to overwrite it? (y/N)'));
  if (overwrite !== 'y') Deno.exit(0);
} catch { /**/ }
try {
  await Deno.lstat(path.join('webhook', `${langName}.json`));
  const overwrite = await input.question(chalkin.yellow('This language file already exists in "webhook". Do you want to overwrite it? (y/N)'));
  if (overwrite !== 'y') Deno.exit(0);
} catch { /**/ }

const commands = {};
const webhook = {};
console.log('');

function convertTo(obj: 'commands' | 'webhook', from: string, to: string, fn?: (v: any) => any) {
  let str = lodash.get(lang, from)
  if (!str) return;
  if (fn) str = fn(str);
  lodash.set(obj === 'commands' ? commands : webhook, to, str);
  console.log(`${chalkin.cyan(`${from} - ${obj} → ${to}`)}`);
}

function convertArgs(o: string | { [key: string]: any }) {
  if (typeof o === 'string') return o.replace(/\{\{&(\w+)\}\}/g, '{{$1}}');


  function recurse(obj: { [key: string]: any }) {
    for (const key of Object.keys(obj)) {
      if (key === 'dayjs') return;
      if (typeof obj[key] === 'object') {
        recurse(obj[key]);
      } else {
        obj[key] = obj[key].replace(/\{\{&(\w+)\}\}/g, '{{$1}}');
      }
    }
  }

  const obj = { ...o };
  recurse(obj);
  return obj;
}

function allowKeys(...keys: string[]) {
  return (obj: { [key: string]: any }) => {
    const newObj: any = {};
    for (const key of keys) {
      if (obj[key]) newObj[key] = obj[key];
    }
    return newObj;
  }
}

// #region Commands Converts
convertTo('commands', '_', '_');
convertTo('commands', 'trello', 'common', allowKeys(
  'label_color', 'perm_levels', 'custom_field'
));
convertTo('commands', 'words.link.one', 'common.link');
convertTo('commands', 'trello.due', 'common.due');
convertTo('commands', 'words.page.one', 'common.page');
convertTo('commands', 'words.list.one', 'common.list');
convertTo('commands', 'words.list.many', 'common.lists');
convertTo('commands', 'words.label.many', 'common.labels');
convertTo('commands', 'words.attachment.one', 'common.attachment');
convertTo('commands', 'words.attachment.many', 'common.attachments');
convertTo('commands', 'words.checklist.many', 'common.checklists');
convertTo('commands', 'words.sticker.many', 'common.stickers');
convertTo('commands', 'words.member.many', 'common.members');
convertTo('commands', 'words.orgs.one', 'common.org');
convertTo('commands', 'words.visibility', 'common.visibility');
convertTo('commands', 'words.info', 'common.info');
convertTo('commands', 'trello.last_act', 'common.last_activity');
convertTo('commands', 'trello.cover_source', 'common.cover_source');

convertTo('commands', 'user_mgmt.cleardata', 'cleardata.done');
convertTo('commands', 'user_mgmt.clearauth', 'clearauth.done');

convertTo('commands', 'words.arch_card.many', 'cards.list_archived');
convertTo('commands', 'words.arch_list.many', 'lists.list_archived');
convertTo('commands', 'words.arch_board.many', 'boards.list_archived');

convertTo('commands', 'words.style.one', 'webhook.style');
convertTo('commands', 'words.id', 'webhook.id');
convertTo('commands', 'words.active', 'webhook.active');
convertTo('commands', 'words.locale', 'webhook.locale');
convertTo('commands', 'webhook_cmd.whitelist', 'webhook.whitelist');
convertTo('commands', 'webhook_cmd.blacklist', 'webhook.blacklist');
convertTo('commands', 'webhook_cmd.dwh.one', 'webhook.dwh');
convertTo('commands', 'webhook_cmd.filter_update', 'webhook.filters_updated');
convertTo('commands', 'webhook_cmd.repaired', 'webhook.repair_done');
convertTo('commands', 'webhook_cmd.choose_cards', 'webhook.choose_cards');
convertTo('commands', 'webhook_cmd.choose_lists', 'webhook.choose_lists');
convertTo('commands', 'webhook_cmd.max_wh', 'webhook.max_wh', (s) => s.replace(' (`{{&cleanPrefix}}donate`)', ''));
convertTo('commands', 'webhook_cmd.wh_expire', 'webhook.wh_expire', (s) => s.replace(' (`{{&cleanPrefix}}donate`)', ''));
convertTo('commands', 'webhook_cmd.styles', 'webhook.styles');
// #endregion

// #region Webhook Converts
convertTo('webhook', 'trello', 'common', allowKeys(
  'old_desc', 'new_desc', 'prev_list', 'curr_list', 'old_name', 'new_name',
  'old_comment', 'new_comment', 'old_due', 'new_due', 'one_chkitem_name', 'one_chklist_name',
  'item_src', 'to_board', 'from_board', 'old_v', 'new_v', 'custom_field',
  'perm_levels', 'invite_perms', 'comment_perms', 'vote_perms',
  'member_type', 'label_color'
));
convertTo('webhook', 'webhooks', 'webhook', convertArgs);
convertTo('webhook', 'webhooks_extended', 'extended', convertArgs);
convertTo('webhook', 'webhook_filters', 'filters');
convertTo('webhook', 'webhook_filter_group', 'group');
// #endregion

console.log('');
await Deno.writeTextFile(path.join('commands', `${langName}.json`), JSON.stringify(commands, null, 2));
console.log(chalkin.green(`✔ commands/${langName}.json`));
await Deno.writeTextFile(path.join('webhook', `${langName}.json`), JSON.stringify(webhook, null, 2));
console.log(chalkin.green(`✔ webhook/${langName}.json`));