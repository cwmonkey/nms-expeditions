((exports) => {

// exports
const {download, escapeRegExp, disableButton, enableButton} = exports;

///////////////////////////////
// Misc
///////////////////////////////

let translationText = '';
function getTranslationText() {
  if (!translationText) {
    translationText = document.getElementById('combined_english').textContent;
    window.translationText = translationText;
  }

  return translationText;
}

let translationObj = null;
function getTranslationObj() {
  if (!translationObj) {
    getTranslationText();
    translationObj = JSON.parse(translationText);
    window.translationObj = translationObj;
  }

  return translationObj;
}

///////////////////////////////
// Combo Box
///////////////////////////////

const $key = $('#key');
const $found = $('#found');
const $showing = $('#showing');
const $value = $('#value');
const $keyvalue = $('#keyvalue');
let exact = true;

function doSearch(value) {
  getTranslationText();

  let count = 0;
  let showing = 0;
  const results = {};
  let field = 'value';
  value = value.trim();

  if (value.substr(0, 3) === 'id:') {
    field = 'key';
    value = value.slice(3).replace(/_/g, '').toUpperCase();
  }

  if (value) {
    let reg;
    let term = '';

    term = escapeRegExp(value);

    if (field === 'value') {
      // reg = new RegExp('"([A-Z_0-9]+)":\\["([A-Z0-9]+)","([^"]*' + term + '[^"]*)"', 'gi');
      reg = new RegExp('"([A-Z_0-9]+)":"(([^"]*' + term + '[^"]*))"', 'gi');
    } else if (field === 'key') {
      // reg = new RegExp('"([A-Z_0-9]+)":\\["([A-Z0-9]*' + term + '[A-Z0-9]*)","([^"]+)"', 'g');
      reg = new RegExp('"(([A-Z0-9_]*' + term + '[A-Z0-9_]*))":"([^"]+)"', 'g');
    } else {
      // reg = new RegExp('("[A-Z_0-9]*' + escapeRegExp(value) + '[A-Z_0-9]*"):("[^"]+")', 'gi');
    }

    const matchAlls = Array.from(translationText.matchAll(reg));

    const matches = matchAlls.slice(0, 200);

    if (matches.length) {
      count = matchAlls.length;
      showing = matches.length;

      matches.forEach((v, k) => {
        if (field === 'value') {
          results[v[1]] = v[3];
        } else {
          results[v[1]] = v[1] + ': ' + v[3];
        }
      });
    }
  }

  const meta = {
    field: field
  };

  return {
    search: value,
    results: results,
    count: count,
    showing: showing,
    meta: meta
  };
}

$('[data-combo]').combo({
  getResult: doSearch,
  markRegFn: (search, meta) => {
    if (meta.field === 'key') {
      return new RegExp('([^:]*?)(' + escapeRegExp(search).split(/(?<!\\)/).join('_?') + ')([^:]*:.*)');
    } else {
      return new RegExp('(.*?)(' + escapeRegExp(search) + ')(.*)', 'i');
    }
  }
});

const $exact = $('#exact').on('change', () => {
  if ($exact.prop('checked')) {
    exact = true;
  } else {
    exact = false;
  }

  doSearch();
});

const $field = $('#field').on('change', () => {
  field = $field.val();

  doSearch();
});

///////////////////////////////
// Reward Tables
///////////////////////////////

let rewardJsonText;
let rewardJsonObj;

function loadRewardJsonObj() {
  if (!rewardJsonObj) {
    rewardJsonText = document.getElementById('rewards_table').textContent;
    rewardJsonObj = JSON.parse(rewardJsonText);
    window.rewardJsonObj = rewardJsonObj;
  }
}

let itemJsonText;
let itemJsonObj;

function loadItemJsonObj() {
  if (!itemJsonObj) {
    itemJsonText = document.getElementById('combined_items').textContent;
    window.itemJsonObj = itemJsonObj = JSON.parse(itemJsonText);
  }
}

const $rewardTables = $('#rewardTables');
const $rewardInfo = $('#rewardInfo');

function showRewards() {
  loadRewardJsonObj();

  for (let tk in rewardJsonObj) {
    const table = rewardJsonObj[tk];

    if (!Array.isArray(table) || !tk.match(/^SeasonRewardTable/)) continue;

    const $ul = $('<ul>');

    table.forEach((v, k) => {
      const $li = $('<li>');
      const $button = $('<button data-reward>' + v.Id + '</button>').data({
        'reward-table-id': tk,
        'reward-index': k
      });

      $li.append($button);
      $ul.append($li);
    });

    $rewardTables.append($('<h3>').text(tk), $ul);
  }
}

function getRewardText(params) {

}

$(document.body).on('click', '[data-reward]', function () {
  getTranslationObj();
  loadItemJsonObj();

  $('[data-reward][disabled').removeAttr('disabled');
  const $el = $(this);
  $el.attr('disabled', true)
  const rewardIndex = $el.data('reward-index');
  const tableId = $el.data('reward-table-id');
  const rewardObj = rewardJsonObj[tableId][rewardIndex];
  const displayObj = {
    Id: rewardObj.Id,
    RewardChoice: rewardObj.List.RewardChoice,
    ListCount: rewardObj.List.List.length,
    List: []
  };

  // TODO: Sick of looking up relationships
  const currencyMapping = {
    Nanites: 'PLAYER_TECH_TITLE',
    Specials: 'PLAYER_SPECIALS_TITLE',
    Units: 'PLAYER_MONEY_TITLE'
  };

  const guildMapping = {
    ExplorerGuild: 'EXP_GUILD_NAME_L',
    OutlawsGuild: 'PIRATE_GUILD_NAME_L',
    MerchantsGuild: 'TRA_GUILD_NAME_L',
    MercenariesGuild: 'WAR_GUILD_NAME_L',
    Gek: 'MISSION_FACTION_1',
    'Vykeen': 'MISSION_FACTION_2',
    Korvax: 'MISSION_FACTION_3'
  };

  const names = {};
  const push = function(params) {
    if (names[params.Name]) {
      return;
    }

    names[params.Name] = true;

    displayObj.List.push(params);
  };

  // Object types
  if (rewardObj.List) {
    displayObj.List = [];

    rewardObj.List.List.forEach((v, k) => {
      if (v.Reward && v.Reward.TechIds) {
        v.Reward.TechIds.forEach((v, k) => {
          const translationId = itemJsonObj[v.Value];
          const name = translationObj[translationId];

          push({
            ItemID: v.Value,
            Name: name,
            isTechReward: true
          });
        });
      } else if (v.Reward && v.Reward.ProductIds) {
        const type = v.Reward._SCHEMA;
        const rewards = {};
        const DisplayProductId = v.Reward.DisplayProductId;

        v.Reward.ProductIds.forEach((v, k) => {
          const translationId = itemJsonObj[v.Value];
          const name = translationObj[translationId];

          if (typeof rewards[v.Value] !== 'undefined') {
            displayObj.List[rewards[v.Value]].Amount++;
          } else {
            rewards[v.Value] = displayObj.List.length;

            const reward = {
              ItemID: v.Value,
              Name: name,
              type: type,
              Amount: 1
            };

            if (DisplayProductId === 'FREIGHT_PAINT') {
              reward.isFreighterPaint = true;
            }

            displayObj.List.push(reward);
          }
        });
      } else if (v.Reward && v.Reward.Items) {
        v.Reward.Items.forEach((v, k) => {
          if (v.MultiItemRewardType === 'InventorySlot') {
            push({
              ItemID: v.MultiItemRewardType,
              name: translationObj['UI_SUIT_INV_TOKEN_NAME_L'],
              Amount: v.Amount,
              isInventorySlotReward: true
            });
          } else if (v.ProcTechGroup) {
            const name = translationObj[v.ProcTechGroup];

            push({
              Name: name,
              MultiItemRewardType: v.MultiItemRewardType,
              Amount: v.Amount,
              ProcTechQuality: v.ProcTechQuality,
              IllegalProcTech: v.IllegalProcTech,
              SentinelProcTech: v.SentinelProcTech,
              AlsoTeachTechBoxRecipe: v.AlsoTeachTechBoxRecipe,
              isTechReward: true
            });
          } else if (v.Id) {
            const translationId = itemJsonObj[v.Id];
            const name = translationObj[translationId];

            push({
              ItemID: v.Id,
              Amount: v.Amount,
              Name: name
            });
          // TODO: Translations
          } else if (v.ProcProdType) {
            push({
              Name: v.ProcProdType.ProceduralProductCategory,
              Amount: v.Amount,
              ProcTechQuality: v.ProcTechQuality,
              Rarity: v.ProcProdRarity.Rarity
            });
          } else {
            push(v);
          }
        });
      } else if (v.Reward && v.Reward.AllRunes) {
        const name = translationObj['UI_GUIDE_HEADING_RUNES_CATA'];

        push({
          Name: name,
          AllRunes: true,
          isRuneReward: true
        });
      } else if (v.Reward && v.Reward.Faction) {
        const name = translationObj[guildMapping[v.Reward.Faction.MissionFaction]];

        push({
          Name: name,
          AmountMin: v.Reward.AmountMin,
          AmountMax: v.Reward.AmountMax,
          isFactionReward: true
        });
      } else if (v.Reward && v.Reward.Type && v.Reward.Type.ProceduralProductCategory) {
        push({
          ProceduralProductCategory: v.Reward.Type.ProceduralProductCategory,
          Rarity: v.Reward.Rarity.Rarity
        });
      } else if (v.Reward && v.Reward.Group) {
        const name = translationObj[v.Reward.Group];
        const reward = {
          Name: name
        };

        if (v.Reward._SCHEMA === 'GcRewardProcTechProduct.xml') {
          reward.isTechReward = true;
        }

        push(reward);
      } else if (v.Reward && v.Reward._SCHEMA === 'GcRewardInventorySlots.xml') {
        const name = translationObj['UI_SUIT_INV_TOKEN_NAME_L'];

        push({
          Name: name,
          Amount: v.Reward.Amount,
          isInventorySlotReward: true
        });
      // TODO: Get ship name?
      } else if (v.Reward && v.Reward._SCHEMA === 'GcRewardSpecificShip.xml') {
        let obj = {
          Name: v.Reward.ShipResource.Filename,
          ShipType: v.Reward.ShipType.ShipClass,
          SizeType: v.Reward.OverrideSizeType.SizeType
        };

        if (v.Reward.NameOverride) {
          obj.Name = translationObj[v.Reward.NameOverride];
        }

        push(obj);
      // TODO: Get frigate name?
      } else if (v.Reward && v.Reward._SCHEMA === 'GcRewardSpecificFrigate.xml') {
        push({
          Name: v.Reward.FrigateClass.FrigateClass,
          IsRewardFrigate: v.Reward.IsRewardFrigate
        });
      } else if (v.Reward && v.Reward.Currency) {
        const translationId = currencyMapping[v.Reward.Currency.Currency];
        const name = translationObj[translationId];

        push({
          ItemID: v.Reward.Currency.Currency,
          Name: name,
          AmountMin: v.Reward.AmountMin,
          AmountMax: v.Reward.AmountMax,
          isCurrencyReward: true
        });
      } else if (v.Reward && v.Reward.TitleID) {
        const translationId = itemJsonObj[v.Reward.TitleID];
        const name = translationObj[translationId];

        /*push({
          ItemID: v.Reward.ID,
          Name: name,
          isTitleReward: true
        });*/
      } else if (v.Reward && v.Reward.ID) {
        const translationId = itemJsonObj[v.Reward.ID];
        const name = translationObj[translationId];

        push({
          ItemID: v.Reward.ID,
          Name: name,
          AmountMin: v.Reward.AmountMin,
          AmountMax: v.Reward.AmountMax
        });
      } else if (v.Reward && v.Reward.IsRewardWeapon) {
        push({
          IsRewardWeapon: true,
          Name: v.Reward.WeaponType.WeaponStatClass
        });
      } else if (v.Reward && v.Reward.TechId) {
        const translationId = itemJsonObj[v.Reward.TechId];
        const name = translationObj[translationId];

        push({
          ItemID: v.Reward.TechId,
          Name: name,
          isTechReward: true
        });
      } else if (v.Reward && v.Reward.NameOverride) {
        const name = translationObj[v.Reward.NameOverride];

        push({
          ItemID: v.Reward.TechId,
          Name: name,
          isTechReward: true
        });
      } else if (v.Reward && v.Reward.EggData) {
        push({
          CreatureID: v.Reward.EggData.CreatureID,
          Name: v.Reward.EggData.CreatureID,
          isEggReward: true
        });
      } else if (v.Reward && v.Reward.ProductID) {
        const translationId = itemJsonObj[v.Reward.ProductID];
        const name = translationObj[translationId];

        push({
          ItemID: v.Reward.ProductID,
          Name: name
        });
      } else if (v.Reward && v.Reward.MessageID) {
      } else {
        push(v);
      }
    });
  }

  $rewardInfo.text(JSON.stringify(displayObj, null, 2) + "\n\n----------------\n\n" + JSON.stringify(rewardObj, null, 2));
  $rewardInfo[0].scrollTop = 0;
});

$showRewards = $('#showRewards').on('click', showRewards);

})(window.exports = window.exports || {});