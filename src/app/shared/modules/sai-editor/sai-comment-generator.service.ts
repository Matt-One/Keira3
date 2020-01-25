import { Injectable } from '@angular/core';

import { SAI_TYPES, SmartScripts } from '@keira-types/smart-scripts.type';
import { SAI_EVENTS } from '@keira-shared/modules/sai-editor/constants/sai-event';
import { SAI_ACTION_COMMENTS, SAI_EVENT_COMMENTS } from '@keira-shared/modules/sai-editor/constants/sai-comments';
import { QueryService } from '@keira-shared/services/query.service';
import { SAI_TARGETS } from '@keira-shared/modules/sai-editor/constants/sai-targets';
import {
  DYNAMIC_FLAGS, EVENT_FLAGS,
  GO_FLAGS,
  NPC_FLAGS, phaseMask,
  templates,
  UNIT_FLAGS, unitBytes1Flags,
  unitFieldBytes1Type, unitStandFlags, unitStandStateType
} from '@keira-shared/modules/sai-editor/constants/sai-constants';

@Injectable({
  providedIn: 'root'
})
export class SaiCommentGeneratorService {

  constructor(
    private queryService: QueryService,
  ) {}

  private getStringByTargetType(smartScript: SmartScripts): string {
    switch (smartScript.target_type) {
      case SAI_TARGETS.SELF:
        return 'Self';
      case SAI_TARGETS.VICTIM:
        return 'Victim';
      case SAI_TARGETS.HOSTILE_SECOND_AGGRO:
        return 'Second On Threatlist';
      case SAI_TARGETS.HOSTILE_LAST_AGGRO:
        return 'Last On Threatlist';
      case SAI_TARGETS.HOSTILE_RANDOM:
        return 'Random On Threatlist';
      case SAI_TARGETS.HOSTILE_RANDOM_NOT_TOP:
        return 'Random On Threatlist Not Top';
      case SAI_TARGETS.ACTION_INVOKER:
        return 'Invoker';
      case SAI_TARGETS.POSITION:
        return 'Position';
      case SAI_TARGETS.CREATURE_RANGE:
      case SAI_TARGETS.CREATURE_DISTANCE:
      case SAI_TARGETS.CLOSEST_CREATURE:
        return `Closest Creature '${this.queryService.getCreatureNameById(smartScript.target_param1)}'`;
      case SAI_TARGETS.CREATURE_GUID:
        return `Closest Creature '${this.queryService.getCreatureNameByGuid(smartScript.target_param1)}'`;
      case SAI_TARGETS.GAMEOBJECT_RANGE:
      case SAI_TARGETS.GAMEOBJECT_DISTANCE:
      case SAI_TARGETS.CLOSEST_GAMEOBJECT:
        return `Closest Creature '${this.queryService.getGameObjectNameById(smartScript.target_param1)}'`;
      case SAI_TARGETS.GAMEOBJECT_GUID:
        return `Closest Creature '${this.queryService.getGameObjectNameByGuid(smartScript.target_param1)}'`;
      case SAI_TARGETS.INVOKER_PARTY:
        return 'Invoker\'s Party';
      case SAI_TARGETS.PLAYER_RANGE:
      case SAI_TARGETS.PLAYER_DISTANCE:
      case SAI_TARGETS.CLOSEST_PLAYER:
        return 'Closest Player';
      case SAI_TARGETS.ACTION_INVOKER_VEHICLE:
        return `Invoker's Vehicle`;
      case SAI_TARGETS.OWNER_OR_SUMMONER:
        return 'Owner Or Summoner';
      case SAI_TARGETS.THREAT_LIST:
        return 'First Unit On Threatlist';
      case SAI_TARGETS.CLOSEST_ENEMY:
        return 'Closest Enemy';
      case SAI_TARGETS.CLOSEST_FRIENDLY:
        return 'Closest Friendly Unit';
      default:
        return '[unsupported target type]';
    }
  }

  /* Get previous script of links chain */
  private getPreviousScriptLink(rows: SmartScripts[], smartScript: SmartScripts): SmartScripts {
    if (smartScript.id === 0) {
      return null;
    }

    for (const row of rows) {
      if (row.link === smartScript.id) {
        // if previous is LINK, return previous of previous
        if (row.event_type === SAI_EVENTS.LINK) {
          return this.getPreviousScriptLink(rows, row);
        } else {
          return row;
        }
      }
    }
  }

  async generateComment(
    rows: SmartScripts[], // the set of smart_scripts rows
    smartScript: SmartScripts, // the specific row that we are generating the comment for
    name: string, // the name of the creature or gameobject
  ): Promise<string> {
    const smartScriptLink = this.getPreviousScriptLink(rows, smartScript);
    let fullLine = '';

    switch (smartScript.source_type) {

      case SAI_TYPES.SAI_TYPE_CREATURE:
        fullLine += name + ' - ';
        fullLine += SAI_EVENT_COMMENTS[smartScript.event_type];
        break;

      case SAI_TYPES.SAI_TYPE_GAMEOBJECT:
        fullLine += name + ' - ';
        fullLine += SAI_EVENT_COMMENTS[smartScript.event_type];
        break;

      case SAI_TYPES.SAI_TYPE_AREATRIGGER:
        fullLine += 'Areatrigger - ';

        switch (smartScript.event_type) {
          case SAI_EVENTS.AREATRIGGER_ONTRIGGER:
          case SAI_EVENTS.LINK:
            fullLine += 'On Trigger';
            break;
          default:
            fullLine += 'INCORRECT EVENT TYPE';
            break;
        }

        break;

      case SAI_TYPES.SAI_TYPE_TIMED_ACTIONLIST:
        // TODO: comment generation of actionlist scripts
        break;
    }

    if ((fullLine.indexOf('_previousLineComment_') > -1) && (smartScriptLink != null)) {

      fullLine = fullLine.replace('_previousLineComment_', SAI_EVENT_COMMENTS[smartScriptLink.event_type]);
      smartScript.event_param1 = smartScriptLink.event_param1;
      smartScript.event_param2 = smartScriptLink.event_param2;
      smartScript.event_param3 = smartScriptLink.event_param3;
      smartScript.event_param4 = smartScriptLink.event_param4;
    }

    fullLine = fullLine.replace('_previousLineComment_', 'MISSING LINK');

    fullLine = fullLine.replace('_eventParamOne_',   `${smartScript.event_param1}`);
    fullLine = fullLine.replace('_eventParamTwo_',   `${smartScript.event_param2}`);
    fullLine = fullLine.replace('_eventParamThree_', `${smartScript.event_param3}`);
    fullLine = fullLine.replace('_eventParamFour_',  `${smartScript.event_param4}`);

    if (fullLine.indexOf('_questNameEventParamOne_') > -1) {
      fullLine = fullLine.replace('_questNameEventParamOne_', await this.queryService.getQuestTitleById(smartScript.event_param1));
    }
    // TODO: spells
    // if (fullLine.indexOf('_spellNameEventParamOne_') > -1) {
    //   fullLine = fullLine.replace('_spellNameEventParamOne_', this.queryService.getSpellNameById(smartScript.event_param1));
    // }
    // if (fullLine.indexOf('_targetCastingSpellName_') > -1) {
    //   fullLine = fullLine.replace('_targetCastingSpellName_', this.queryService.getSpellNameById(smartScript.event_param3));
    // }
    // if (fullLine.indexOf('_hasAuraEventParamOne_') > -1) {
    //   fullLine = fullLine.replace('_hasAuraEventParamOne_',   this.queryService.getSpellNameById(smartScript.event_param1));
    // }

    // ! Action type
    fullLine += ' - ' + SAI_ACTION_COMMENTS[smartScript.action_type];

    fullLine = fullLine.replace('_actionParamOne_',   `${smartScript.action_param1}`);
    fullLine = fullLine.replace('_actionParamTwo_',   `${smartScript.action_param2}`);
    fullLine = fullLine.replace('_actionParamThree_', `${smartScript.action_param3}`);
    fullLine = fullLine.replace('_actionParamFour_',  `${smartScript.action_param4}`);
    fullLine = fullLine.replace('_actionParamFive_',  `${smartScript.action_param5}`);
    fullLine = fullLine.replace('_actionParamSix_',   `${smartScript.action_param6}`);

    if (fullLine.indexOf('_questNameActionParamOne_') > -1) {
      fullLine = fullLine.replace('_questNameActionParamOne_', await this.queryService.getQuestTitleById(smartScript.action_param1));
    }
    // TODO: spells
    // if (fullLine.indexOf('_spellNameActionParamOne_') > -1) {
    //   fullLine = fullLine.replace('_spellNameActionParamOne_', this.queryService.getSpellNameById(smartScript.action_param1));
    // }
    // if (fullLine.indexOf('_spellNameActionParamTwo_') > -1) {
    //   fullLine = fullLine.replace('_spellNameActionParamTwo_', this.queryService.getSpellNameById(smartScript.action_param2));
    // }
    // if (fullLine.indexOf('_questNameCastCreatureOrGo_') > -1) {
    //   fullLine = fullLine.replace('_questNameCastCreatureOrGo_', this.queryService.getQuestTitleByCriteriaFunc1(
    //     smartScript.action_param1,
    //     smartScript.action_param1,
    //     smartScript.action_param1,
    //     smartScript.action_param1,
    //     smartScript.action_param2,
    //   ));
    // }
    // if (fullLine.indexOf('_questNameKillCredit_') > -1) {
    //   fullLine = fullLine.replace('_questNameKillCredit_', this.queryService.getQuestTitleByCriteriaFunc2
    //   (smartScript.action_param1, smartScript.action_param1, smartScript.action_param1, smartScript.action_param1)
    //   );
    // }

    if (fullLine.indexOf('_reactStateParamOne_') > -1) {

      switch (Number(smartScript.action_param1)) {
        case 0:
          fullLine = fullLine.replace('_reactStateParamOne_', 'Passive');
          break;
        case 1:
          fullLine = fullLine.replace('_reactStateParamOne_', 'Defensive');
          break;
        case 2:
          fullLine = fullLine.replace('_reactStateParamOne_', 'Aggressive');
          break;
        default:
          fullLine = fullLine.replace('_reactStateParamOne_', '[Unknown Reactstate]');
          break;
      }
    }

    if (fullLine.indexOf('_actionRandomParameters_') > -1) {

      let randomEmotes = smartScript.action_param1 + ', ' + smartScript.action_param2;

      if (smartScript.action_param3 > 0) {
        randomEmotes += ', ' + smartScript.action_param3;
      }

      if (smartScript.action_param4 > 0) {
        randomEmotes += ', ' + smartScript.action_param4;
      }

      if (smartScript.action_param5 > 0) {
        randomEmotes += ', ' + smartScript.action_param5;
      }

      if (smartScript.action_param6 > 0) {
        randomEmotes += ', ' + smartScript.action_param6;
      }

      fullLine = fullLine.replace('_actionRandomParameters_', randomEmotes);
    }

    if (fullLine.indexOf('_creatureNameActionParamOne_') > -1) {
      fullLine = fullLine.replace('_creatureNameActionParamOne_', await this.queryService.getCreatureNameById(smartScript.action_param1));
    }

    if (fullLine.indexOf('_getUnitFlags_') > -1) {

      let commentUnitFlag = '';
      const unitFlags = smartScript.action_param1;

      if ((unitFlags & UNIT_FLAGS.SERVER_CONTROLLED) !== 0) { commentUnitFlag += 'Server Controlled & '; }
      if ((unitFlags & UNIT_FLAGS.NON_ATTACKABLE) !== 0)    { commentUnitFlag += 'Not Attackable & '; }
      if ((unitFlags & UNIT_FLAGS.DISABLE_MOVE) !== 0)      { commentUnitFlag += 'Disable Movement & '; }
      if ((unitFlags & UNIT_FLAGS.PVP_ATTACKABLE) !== 0)    { commentUnitFlag += 'PvP Attackable & '; }
      if ((unitFlags & UNIT_FLAGS.RENAME) !== 0)            { commentUnitFlag += 'Rename & '; }
      if ((unitFlags & UNIT_FLAGS.PREPARATION) !== 0)       { commentUnitFlag += 'Preparation & '; }
      if ((unitFlags & UNIT_FLAGS.NOT_ATTACKABLE_1) !== 0)  { commentUnitFlag += 'Not Attackable & '; }
      if ((unitFlags & UNIT_FLAGS.IMMUNE_TO_PC) !== 0)      { commentUnitFlag += 'Immune To Players & '; }
      if ((unitFlags & UNIT_FLAGS.IMMUNE_TO_NPC) !== 0)     { commentUnitFlag += 'Immune To NPC\'s & '; }
      if ((unitFlags & UNIT_FLAGS.LOOTING) !== 0)           { commentUnitFlag += 'Looting & '; }
      if ((unitFlags & UNIT_FLAGS.PET_IN_COMBAT) !== 0)     { commentUnitFlag += 'Pet In Combat & '; }
      if ((unitFlags & UNIT_FLAGS.PVP) !== 0)               { commentUnitFlag += 'PvP & '; }
      if ((unitFlags & UNIT_FLAGS.SILENCED) !== 0)          { commentUnitFlag += 'Silenced & '; }
      if ((unitFlags & UNIT_FLAGS.PACIFIED) !== 0)          { commentUnitFlag += 'Pacified & '; }
      if ((unitFlags & UNIT_FLAGS.STUNNED) !== 0)           { commentUnitFlag += 'Stunned & '; }
      if ((unitFlags & UNIT_FLAGS.IN_COMBAT) !== 0)         { commentUnitFlag += 'In Combat & '; }
      if ((unitFlags & UNIT_FLAGS.DISARMED) !== 0)          { commentUnitFlag += 'Disarmed & '; }
      if ((unitFlags & UNIT_FLAGS.CONFUSED) !== 0)          { commentUnitFlag += 'Confused & '; }
      if ((unitFlags & UNIT_FLAGS.FLEEING) !== 0)           { commentUnitFlag += 'Fleeing & '; }
      if ((unitFlags & UNIT_FLAGS.PLAYER_CONTROLLED) !== 0) { commentUnitFlag += 'Player Controlled & '; }
      if ((unitFlags & UNIT_FLAGS.NOT_SELECTABLE) !== 0)    { commentUnitFlag += 'Not Selectable & '; }
      if ((unitFlags & UNIT_FLAGS.SKINNABLE) !== 0)         { commentUnitFlag += 'Skinnable & '; }
      if ((unitFlags & UNIT_FLAGS.MOUNT) !== 0)             { commentUnitFlag += 'Mounted & '; }
      if ((unitFlags & UNIT_FLAGS.SHEATHE) !== 0)           { commentUnitFlag += 'Sheathed & '; }

      if (commentUnitFlag.indexOf('&') > -1) {
        // ! Trim last ' & ' from the comment..
        commentUnitFlag = commentUnitFlag.substring(0, commentUnitFlag.length - 3);

        fullLine = fullLine.replace('_getUnitFlags_', 's_getUnitFlags_');
      }

      fullLine = fullLine.replace('_getUnitFlags_', ' ' + commentUnitFlag);
    }

    if (fullLine.indexOf('_getNpcFlags_') > -1) {
      let commentNpcFlag = '';
      const npcFlags = smartScript.action_param1;

      if ((npcFlags & NPC_FLAGS.NONE) !== 0)               { commentNpcFlag += 'None & '; }
      if ((npcFlags & NPC_FLAGS.GOSSIP) !== 0)             { commentNpcFlag += 'Gossip & '; }
      if ((npcFlags & NPC_FLAGS.QUESTGIVER) !== 0)         { commentNpcFlag += 'Questgiver & '; }
      if ((npcFlags & NPC_FLAGS.UNK1) !== 0)               { commentNpcFlag += 'Unknown 1 & '; }
      if ((npcFlags & NPC_FLAGS.UNK2) !== 0)               { commentNpcFlag += 'Unknown 2 & '; }
      if ((npcFlags & NPC_FLAGS.TRAINER) !== 0)            { commentNpcFlag += 'Trainer & '; }
      if ((npcFlags & NPC_FLAGS.TRAINER_CLASS) !== 0)      { commentNpcFlag += 'Class Trainer & '; }
      if ((npcFlags & NPC_FLAGS.TRAINER_PROFESSION) !== 0) { commentNpcFlag += 'Profession Trainer & '; }
      if ((npcFlags & NPC_FLAGS.VENDOR) !== 0)             { commentNpcFlag += 'Vendor & '; }
      if ((npcFlags & NPC_FLAGS.VENDOR_AMMO) !== 0)        { commentNpcFlag += 'Ammo Vendor & '; }
      if ((npcFlags & NPC_FLAGS.VENDOR_FOOD) !== 0)        { commentNpcFlag += 'Food Vendor & '; }
      if ((npcFlags & NPC_FLAGS.VENDOR_POISON) !== 0)      { commentNpcFlag += 'Poison Vendor & '; }
      if ((npcFlags & NPC_FLAGS.VENDOR_REAGENT) !== 0)     { commentNpcFlag += 'Reagent Vendor & '; }
      if ((npcFlags & NPC_FLAGS.REPAIR) !== 0)             { commentNpcFlag += 'Repair Vendor & '; }
      if ((npcFlags & NPC_FLAGS.FLIGHTMASTER) !== 0)       { commentNpcFlag += 'Flightmaster & '; }
      if ((npcFlags & NPC_FLAGS.SPIRITHEALER) !== 0)       { commentNpcFlag += 'Spirithealer & '; }
      if ((npcFlags & NPC_FLAGS.SPIRITGUIDE) !== 0)        { commentNpcFlag += 'Spiritguide & '; }
      if ((npcFlags & NPC_FLAGS.INNKEEPER) !== 0)          { commentNpcFlag += 'Innkeeper & '; }
      if ((npcFlags & NPC_FLAGS.BANKER) !== 0)             { commentNpcFlag += 'Banker & '; }
      if ((npcFlags & NPC_FLAGS.PETITIONER) !== 0)         { commentNpcFlag += 'Petitioner & '; }
      if ((npcFlags & NPC_FLAGS.TABARDDESIGNER) !== 0)     { commentNpcFlag += 'Tabard Designer & '; }
      if ((npcFlags & NPC_FLAGS.BATTLEMASTER) !== 0)       { commentNpcFlag += 'Battlemaster & '; }
      if ((npcFlags & NPC_FLAGS.AUCTIONEER) !== 0)         { commentNpcFlag += 'Auctioneer & '; }
      if ((npcFlags & NPC_FLAGS.STABLEMASTER) !== 0)       { commentNpcFlag += 'Stablemaster & '; }
      if ((npcFlags & NPC_FLAGS.GUILD_BANKER) !== 0)       { commentNpcFlag += 'Guild Banker & '; }
      if ((npcFlags & NPC_FLAGS.SPELLCLICK) !== 0)         { commentNpcFlag += 'Spellclick & '; }
      if ((npcFlags & NPC_FLAGS.PLAYER_VEHICLE) !== 0)     { commentNpcFlag += 'Player Vehicle & '; }

      if (commentNpcFlag.indexOf('&') > -1) {
        // ! Trim last ' & ' from the comment..
        commentNpcFlag = commentNpcFlag.substring(0, commentNpcFlag.length - 3);

        fullLine = fullLine.replace('_getNpcFlags_', 's_getNpcFlags_');
      }

      fullLine = fullLine.replace('_getNpcFlags_', ' ' + commentNpcFlag);
    }

    if (fullLine.indexOf('_startOrStopActionParamOne_') > -1) {

      if (`${smartScript.action_param1}` === '0') {
        fullLine = fullLine.replace('_startOrStopActionParamOne_', 'Stop');
      } else { // ! Even if above 1 or below 0 we start attacking/allow-combat-movement
        fullLine = fullLine.replace('_startOrStopActionParamOne_', 'Start');
      }
    }

    if (fullLine.indexOf('_enableDisableActionParamOne_') > -1) {

      if (`${smartScript.action_param1}` === '0') {
        fullLine = fullLine.replace('_enableDisableActionParamOne_', 'Disable');
      } else { // ! Even if above 1 or below 0 we start attacking/allow-combat-movement
        fullLine = fullLine.replace('_enableDisableActionParamOne_', 'Enable');
      }
    }

    if (fullLine.indexOf('_incrementOrDecrementActionParamOne_') > -1) {

      if (`${smartScript.action_param1}` === '1') {
        fullLine = fullLine.replace('_incrementOrDecrementActionParamOne_', 'Increment');
      } else if (`${smartScript.action_param2}` === '1') {
        fullLine = fullLine.replace('_incrementOrDecrementActionParamOne_', 'Decrement');
      } else {
        fullLine = fullLine.replace('_incrementOrDecrementActionParamOne_', 'Increment or Decrement');
      }
      // else //? What to do?
    }

    if (fullLine.indexOf('_sheathActionParamOne_') > -1) {

      switch (smartScript.action_param1) {
        case 0:
          fullLine = fullLine.replace('_sheathActionParamOne_', 'Unarmed');
          break;
        case 1:
          fullLine = fullLine.replace('_sheathActionParamOne_', 'Melee');
          break;
        case 2:
          fullLine = fullLine.replace('_sheathActionParamOne_', 'Ranged');
          break;
        default:
          fullLine = fullLine.replace('_sheathActionParamOne_', '[Unknown Sheath]');
          break;
      }
    }

    if (fullLine.indexOf('_forceDespawnActionParamOne_') > -1) {

      if (smartScript.action_param1 > 2) {
        fullLine = fullLine.replace('_forceDespawnActionParamOne_', 'In ' + smartScript.action_param1 + ' ms');
      } else {
        fullLine = fullLine.replace('_forceDespawnActionParamOne_', 'Instant');
      }
    }

    if (fullLine.indexOf('_invincibilityHpActionParamsOneTwo_') > -1) {

      if (smartScript.action_param1 > 0) {
        fullLine = fullLine.replace('_invincibilityHpActionParamsOneTwo_', 'Set Invincibility Hp ' + smartScript.action_param1);
      } else if (smartScript.action_param2 > 0) {
        fullLine = fullLine.replace('_invincibilityHpActionParamsOneTwo_', 'Set Invincibility Hp ' + smartScript.action_param2 + '%');
      } else if (smartScript.action_param1 === 0 && smartScript.action_param2 === 0) {
        fullLine = fullLine.replace('_invincibilityHpActionParamsOneTwo_', 'Reset Invincibility Hp');
      } else {
        fullLine = fullLine.replace('_invincibilityHpActionParamsOneTwo_', '[Unsupported parameters]');
      }
    }

    if (fullLine.indexOf('_onOffActionParamOne_') > -1) {

      if (smartScript.action_param1 === 1) {
        fullLine = fullLine.replace('_onOffActionParamOne_', 'On');
      } else {
        fullLine = fullLine.replace('_onOffActionParamOne_', 'Off');
      }
    }

    if (fullLine.indexOf('_gameobjectNameActionParamOne_') > -1) {
      fullLine = fullLine.replace('_gameobjectNameActionParamOne_', `'${await this.queryService.getGameObjectNameById(smartScript.action_param1)}'`);
    }

    if (fullLine.indexOf('_addItemBasedOnActionParams_') > -1) {
      fullLine = fullLine.replace('_addItemBasedOnActionParams_',
        `'${await this.queryService.getItemNameById(smartScript.action_param1)}'`,
      );

      if (smartScript.action_param2 > 1) {
        fullLine += ' ' + smartScript.action_param2 + ' Times';
      } else {
        fullLine += ' 1 Time';
      }
    }

    if (fullLine.indexOf('_updateAiTemplateActionParamOne_') > -1) {

      switch (smartScript.action_param1) {
        case templates.BASIC:
          fullLine = fullLine.replace('_updateAiTemplateActionParamOne_', 'Basic');
          break;
        case templates.CASTER:
          fullLine = fullLine.replace('_updateAiTemplateActionParamOne_', 'Caster');
          break;
        case templates.TURRET:
          fullLine = fullLine.replace('_updateAiTemplateActionParamOne_', 'Turret');
          break;
        case templates.PASSIVE:
          fullLine = fullLine.replace('_updateAiTemplateActionParamOne_', 'Passive');
          break;
        case templates.CAGED_GO_PART:
          fullLine = fullLine.replace('_updateAiTemplateActionParamOne_', 'Caged Gameobject Part');
          break;
        case templates.CAGED_NPC_PART:
          fullLine = fullLine.replace('_updateAiTemplateActionParamOne_', 'Caged Creature Part');
          break;
        default:
          fullLine = fullLine.replace('_updateAiTemplateActionParamOne_', '<_updateAiTemplateActionParamOne_ Unknown ai template]');
          break;
      }
    }

    if (fullLine.indexOf('_setOrientationTargetType_') > -1) {

      switch (Number(smartScript.target_type)) {
        case SAI_TARGETS.SELF:
          fullLine = fullLine.replace('_setOrientationTargetType_', 'Home Position');
          break;
        case SAI_TARGETS.POSITION:
          fullLine = fullLine.replace('_setOrientationTargetType_', `${smartScript.target_o}`);
          break;
        default:
          fullLine = fullLine.replace('_setOrientationTargetType_', this.getStringByTargetType(smartScript));
          break;
      }
    }

    if (fullLine.indexOf('_getTargetType_') > -1) {
      fullLine = fullLine.replace('_getTargetType_', this.getStringByTargetType(smartScript));
    }

    if (fullLine.indexOf('_goStateActionParamOne_') > -1) {

      switch (smartScript.action_param1) {
        case 0:
          fullLine = fullLine.replace('_goStateActionParamOne_', 'Not Ready');
          break;
        case 1:
          fullLine = fullLine.replace('_goStateActionParamOne_', 'Ready');
          break;
        case 2:
          fullLine = fullLine.replace('_goStateActionParamOne_', 'Activated');
          break;
        case 3:
          fullLine = fullLine.replace('_goStateActionParamOne_', 'Deactivated');
          break;
        default:
          fullLine = fullLine.replace('_goStateActionParamOne_', '[Unknown Gameobject State]');
          break;
      }
    }

    if (fullLine.indexOf('_getGoFlags_') > -1) {
      let commentGoFlag = '';
      const goFlags = smartScript.action_param1;

      if ((goFlags & GO_FLAGS.IN_USE) !== 0)         { commentGoFlag += 'In Use & '; }
      if ((goFlags & GO_FLAGS.LOCKED) !== 0)         { commentGoFlag += 'Locked & '; }
      if ((goFlags & GO_FLAGS.INTERACT_COND) !== 0)  { commentGoFlag += 'Interact Condition & '; }
      if ((goFlags & GO_FLAGS.TRANSPORT) !== 0)      { commentGoFlag += 'Transport & '; }
      if ((goFlags & GO_FLAGS.NOT_SELECTABLE) !== 0) { commentGoFlag += 'Not Selectable & '; }
      if ((goFlags & GO_FLAGS.NODESPAWN) !== 0)      { commentGoFlag += 'No Despawn & '; }
      if ((goFlags & GO_FLAGS.TRIGGERED) !== 0)      { commentGoFlag += 'Triggered & '; }
      if ((goFlags & GO_FLAGS.DAMAGED) !== 0)        { commentGoFlag += 'Damaged & '; }
      if ((goFlags & GO_FLAGS.DESTROYED) !== 0)      { commentGoFlag += 'Destroyed & '; }

      if (commentGoFlag.indexOf('&') > -1) {
        // ! Trim last ' & ' from the comment..
        commentGoFlag = commentGoFlag.substring(0, commentGoFlag.length - 3);

        fullLine = fullLine.replace('_getGoFlags_', 's_getGoFlags_');
      }

      fullLine = fullLine.replace('_getGoFlags_', ' ' + commentGoFlag);
    }

    if (fullLine.indexOf('_getDynamicFlags_') > -1) {

      let commentDynamicFlag = '';
      const dynamicFlags = smartScript.action_param1;

      if ((dynamicFlags & DYNAMIC_FLAGS.NONE) !== 0)                      { commentDynamicFlag += 'None & '; }
      if ((dynamicFlags & DYNAMIC_FLAGS.LOOTABLE) !== 0)                  { commentDynamicFlag += 'Lootable & '; }
      if ((dynamicFlags & DYNAMIC_FLAGS.TRACK_UNIT) !== 0)                { commentDynamicFlag += 'Track Units & '; }
      if ((dynamicFlags & DYNAMIC_FLAGS.TAPPED) !== 0)                    { commentDynamicFlag += 'Tapped & '; }
      if ((dynamicFlags & DYNAMIC_FLAGS.TAPPED_BY_PLAYER) !== 0)          { commentDynamicFlag += 'Tapped By Player & '; }
      if ((dynamicFlags & DYNAMIC_FLAGS.SPECIALINFO) !== 0)               { commentDynamicFlag += 'Special Info & '; }
      if ((dynamicFlags & DYNAMIC_FLAGS.DEAD) !== 0)                      { commentDynamicFlag += 'Dead & '; }
      if ((dynamicFlags & DYNAMIC_FLAGS.REFER_A_FRIEND) !== 0)            { commentDynamicFlag += 'Refer A Friend & '; }
      if ((dynamicFlags & DYNAMIC_FLAGS.TAPPED_BY_ALL_THREAT_LIST) !== 0) { commentDynamicFlag += 'Tapped By Threatlist & '; }

      if (commentDynamicFlag.indexOf('&') > -1) {
        // ! Trim last ' & ' from the comment..
        commentDynamicFlag = commentDynamicFlag.substring(0, commentDynamicFlag.length - 3);

        fullLine = fullLine.replace('_getDynamicFlags_', 's_getDynamicFlags_');
      }

      fullLine = fullLine.replace('_getDynamicFlags_', ' ' + commentDynamicFlag);
    }

    if (fullLine.indexOf('_getBytes1Flags_') > -1) {

      switch (smartScript.action_param2) {
        case unitFieldBytes1Type.STAND_STAND_STATE_TYPE:
          switch (smartScript.action_param1) {
            case unitStandStateType.STAND:
              fullLine = fullLine.replace('_getBytes1Flags_', 'Standstate Stand Up');
              break;
            case unitStandStateType.SIT:
              fullLine = fullLine.replace('_getBytes1Flags_', 'Standstate Sit Down');
              break;
            case unitStandStateType.SIT_CHAIR:
              fullLine = fullLine.replace('_getBytes1Flags_', 'Standstate Sit Down Chair');
              break;
            case unitStandStateType.SLEEP:
              fullLine = fullLine.replace('_getBytes1Flags_', 'Standstate Sleep');
              break;
            case unitStandStateType.SIT_LOW_CHAIR:
              fullLine = fullLine.replace('_getBytes1Flags_', 'Standstate Sit Low Chair');
              break;
            case unitStandStateType.SIT_MEDIUM_CHAIR:
              fullLine = fullLine.replace('_getBytes1Flags_', 'Standstate Sit Medium Chair');
              break;
            case unitStandStateType.SIT_HIGH_CHAIR:
              fullLine = fullLine.replace('_getBytes1Flags_', 'Standstate Sit High Chair');
              break;
            case unitStandStateType.DEAD:
              fullLine = fullLine.replace('_getBytes1Flags_', 'Standstate Dead');
              break;
            case unitStandStateType.KNEEL:
              fullLine = fullLine.replace('_getBytes1Flags_', 'Standstate Kneel');
              break;
            case unitStandStateType.SUBMERGED:
              fullLine = fullLine.replace('_getBytes1Flags_', 'Standstate Submerged');
              break;
            default:
              fullLine = fullLine.replace('_getBytes1Flags_', '[Unknown bytes1 (unitStandStateType.)]');
              break;
          }
          break;

        case unitFieldBytes1Type.PET_TALENTS_TYPE:
          fullLine = fullLine.replace('_getBytes1Flags_', '[Unknown bytes1 type]');
          break;

        case unitFieldBytes1Type.STAND_FLAGS_TYPE:
          switch (Number(smartScript.action_param1)) {
            case unitStandFlags.UNK1:
            case unitStandFlags.UNK4:
            case unitStandFlags.UNK5:
              fullLine = fullLine.replace('_getBytes1Flags_', '[Unknown]');
              break;
            case unitStandFlags.CREEP:
              fullLine = fullLine.replace('_getBytes1Flags_', 'Creep');
              break;
            case unitStandFlags.UNTRACKABLE:
              fullLine = fullLine.replace('_getBytes1Flags_', 'Untrackable');
              break;
            default:
              fullLine = fullLine.replace('_getBytes1Flags_', '[Unknown bytes1 (UnitStandFlags)]');
              break;
          }
          break;

        case unitFieldBytes1Type.BYTES1_FLAGS_TYPE:

          switch (Number(smartScript.action_param1)) {
            case unitBytes1Flags.UNK_3:
              fullLine = fullLine.replace('_getBytes1Flags_', '[Unknown]');
              break;
            case unitBytes1Flags.HOVER:
              fullLine = fullLine.replace('_getBytes1Flags_', 'Hover');
              break;
            case unitBytes1Flags.ALWAYS_STAND:
              fullLine = fullLine.replace('_getBytes1Flags_', 'Always Stand');
              break;
            default:
              fullLine = fullLine.replace('_getBytes1Flags_', '[Unknown bytes1 (UnitBytes1_Flags)]');
              break;
          }
          break;

        default:
          break;
      }
    }

    if (fullLine.indexOf('_powerTypeActionParamOne_') > -1) {
      switch (Number(smartScript.action_param1)) {
        case 0:
          fullLine = fullLine.replace('_powerTypeActionParamOne_', 'Mana');
          break;
        case 1:
          fullLine = fullLine.replace('_powerTypeActionParamOne_', 'Rage');
          break;
        case 2:
          fullLine = fullLine.replace('_powerTypeActionParamOne_', 'Focus');
          break;
        case 3:
          fullLine = fullLine.replace('_powerTypeActionParamOne_', 'Energy');
          break;
        case 4:
          fullLine = fullLine.replace('_powerTypeActionParamOne_', 'Happiness');
          break;
        case 5:
          fullLine = fullLine.replace('_powerTypeActionParamOne_', 'Rune');
          break;
        case 6:
          fullLine = fullLine.replace('_powerTypeActionParamOne_', 'Runic Power');
          break;
        default:
          fullLine = fullLine.replace('_powerTypeActionParamOne_', '[Unknown Powertype]');
          break;
      }
    }

    if (fullLine.indexOf('_morphToEntryOrModelActionParams_') > -1) {

      if (smartScript.action_param1 > 0) {
        fullLine = fullLine.replace(
          '_morphToEntryOrModelActionParams_',
          'Morph To Creature ' + await this.queryService.getCreatureNameById(smartScript.action_param1),
        );
      } else if (smartScript.action_param2 > 0) {
        fullLine = fullLine.replace('_morphToEntryOrModelActionParams_', 'Morph To Model ' + smartScript.action_param2);
      } else {
        fullLine = fullLine.replace('_morphToEntryOrModelActionParams_', 'Demorph');
      }
    }

    if (fullLine.indexOf('_mountToEntryOrModelActionParams_') > -1) {
      if (smartScript.action_param1 > 0) {
        fullLine = fullLine.replace(
          '_mountToEntryOrModelActionParams_',
          'Mount To Creature ' + await this.queryService.getCreatureNameById(smartScript.action_param1),
        );
      } else if (smartScript.action_param2 > 0) {
        fullLine = fullLine.replace('_mountToEntryOrModelActionParams_', 'Mount To Model ' + smartScript.action_param2);
      } else {
        fullLine = fullLine.replace('_mountToEntryOrModelActionParams_', 'Dismount');
      }
    }

    if (fullLine.indexOf('_startOrStopBasedOnTargetType_') > -1) {
      if (smartScript.target_type === 0) {
        fullLine = fullLine.replace('_startOrStopBasedOnTargetType_', 'Stop');
        fullLine = fullLine.replace('_getTargetType_', '');
      } else {
        fullLine = fullLine.replace('_startOrStopBasedOnTargetType_', 'Start');
      }
    }

    let event_phase_mask = smartScriptLink != null ? smartScriptLink.event_phase_mask : smartScript.event_phase_mask;

    if (event_phase_mask !== phaseMask.ALWAYS) {
      const arrayOfSplitPhases = [];

      let event_phase_mask2 = event_phase_mask;
      let log2 = 0;

      while (event_phase_mask2 >= 2) {
        event_phase_mask2 /= 2;
        log2++;
      }

      for (let l2 = log2; l2 >= 0; l2--) {
        const power = Math.pow(2, l2);

        if (event_phase_mask >= power) {
          event_phase_mask -= power;
          arrayOfSplitPhases.push(power);
        }
      }

      arrayOfSplitPhases.reverse(); // Reverse them so they are ascending
      fullLine += ' (Phase';

      if (arrayOfSplitPhases.length > 1) {
        fullLine += 's';
      }

      fullLine += ' ' + arrayOfSplitPhases.join(' & ') + ')';
    }

    const event_flags = smartScriptLink != null ? smartScriptLink.event_flags : smartScript.event_flags;

    if (event_flags !== EVENT_FLAGS.NONE) {

      if (((event_flags & EVENT_FLAGS.NOT_REPEATABLE) !== 0)) {
        fullLine += ' (No Repeat)';
      }

      if (((event_flags & EVENT_FLAGS.NORMAL_DUNGEON) !== 0) &&
        ((event_flags & EVENT_FLAGS.HEROIC_DUNGEON) !== 0) &&
        ((event_flags & EVENT_FLAGS.NORMAL_RAID) !== 0)    &&
        ((event_flags & EVENT_FLAGS.HEROIC_RAID) !== 0)) {
        fullLine += ' (Dungeon & Raid)';
      } else {
        if (((event_flags & EVENT_FLAGS.NORMAL_DUNGEON) !== 0) &&
          ((event_flags & EVENT_FLAGS.HEROIC_DUNGEON) !== 0)) {
          fullLine += ' (Dungeon)';
        } else {
          if (((event_flags & EVENT_FLAGS.NORMAL_DUNGEON) !== 0)) {
            fullLine += ' (Normal Dungeon)';
          } else if (((event_flags & EVENT_FLAGS.HEROIC_DUNGEON) !== 0)) {
            fullLine += ' (Heroic Dungeon)';
          }
        }
      }

      if (((event_flags & EVENT_FLAGS.NORMAL_RAID) !== 0) &&
        ((event_flags & EVENT_FLAGS.HEROIC_RAID) !== 0)) {
        fullLine += ' (Raid)';
      } else {
        if (((event_flags & EVENT_FLAGS.NORMAL_RAID) !== 0)) {
          fullLine += ' (Normal Raid)';
        } else if (((event_flags & EVENT_FLAGS.HEROIC_RAID) !== 0)) {
          fullLine += ' (Heroic Raid)';
        }
      }

      if (((event_flags & EVENT_FLAGS.DEBUG_ONLY) !== 0)) {
        fullLine += ' (Debug)';
      }
    }

    return fullLine;
  }
}
