import { world, system } from "@minecraft/server";

// 武器ごとのクールダウン設定（秒 → tick単位）
const weaponCooldowns = {
  "vsconw:blacksteel_greatblade": 20, // 1秒（20tick）
  "vsconw:blacksteel_greataxe": 36, // 1.8秒（20tick）
  "vsconw:blacksteel_rapier": 10 // 0.5秒（10tick）
  // 例: "yourpack:super_fast_dagger": 5, // 0.25秒
};

const cooldownMap = new Map();

world.beforeEvents.entityHit.subscribe(event => {
  const attacker = event.damagingEntity;
  if (!attacker || !attacker.hasComponent("equippable")) return;

  const item = attacker.getComponent("equippable").getEquipment("mainhand");
  if (!item) return;

  const weaponId = item.typeId;
  const cooldownTicks = weaponCooldowns[weaponId];

  if (!cooldownTicks) return; // 管理外の武器なら無視

  const attackerId = attacker.id;
  const lastUsedTick = cooldownMap.get(attackerId + weaponId) ?? -999;
  const currentTick = system.currentTick;

  if (currentTick - lastUsedTick < cooldownTicks) {
    // クールダウン中：ダメージ無効
    event.cancel = true;
    return;
  }

  // 攻撃記録更新
  cooldownMap.set(attackerId + weaponId, currentTick);
});

const enchantments = [
  { name: "爆熱波動", lore: "爆発", material: "minecraft:gunpowder" },
  { name: "閃雷剣気", lore: "雷", material: "minecraft:trident" },
  { name: "凍結刻印", lore: "凍結", material: "minecraft:ice" },
  { name: "吸魂の刃", lore: "吸収", material: "minecraft:nether_wart" },
  { name: "時空干渉", lore: "速度", material: "minecraft:ender_pearl" },
  { name: "吠える魔刃", lore: "ノックバック", material: "minecraft:piston" },
  { name: "無音の刃", lore: "無音", material: "minecraft:white_wool" },
  { name: "高速連撃", lore: "連撃", material: "minecraft:feather" },
  { name: "光の守護", lore: "耐性", material: "minecraft:glowstone_dust" },
  { name: "闇の呪縛", lore: "暗闇", material: "minecraft:coal" },
  { name: "重力操作", lore: "吹き飛ばし", material: "minecraft:shulker_shell" },
  { name: "炎の輪廻", lore: "炎上", material: "minecraft:magma_cream" },
  { name: "魔力干渉", lore: "力", material: "minecraft:lapis_lazuli" },
  { name: "死霊共鳴", lore: "瀕死強化", material: "minecraft:bone_block" },
  { name: "精神錯乱", lore: "仲間割れ", material: "minecraft:snowball" },
  { name: "閃光幻覚", lore: "透明", material: "minecraft:glass" },
  { name: "黒炎斬", lore: "黒炎", material: "minecraft:blackstone" },
  { name: "音速踏破", lore: "跳躍加速", material: "minecraft:slime_ball" },
  { name: "磁力転移", lore: "引き寄せ", material: "minecraft:redstone" },
  { name: "星核反応", lore: "臨界爆発", material: "minecraft:nether_star" },
];

const TICK_INTERVAL = 20;

system.runInterval(() => {
  for (const player of world.getPlayers()) {
    const items = [...player.dimension.getEntities({ type: "minecraft:item" })];

    for (const ench of enchantments) {
      const mat = items.find(e => e.getComponent("item")?.itemStack?.typeId === ench.material);
      const tool = items.find(e =>
        e !== mat &&
        e.getComponent("item")?.itemStack?.typeId !== ench.material
      );

      if (mat && tool) {
        const toolStack = tool.getComponent("item").itemStack;
        const loreList = [...(toolStack.getLore() ?? [])];
        const count = loreList.filter(line => line.includes(ench.lore)).length;
        if (count >= 3) continue;

        loreList.push(`§7[${ench.lore}]`);
        toolStack.setLore(loreList);
        player.dimension.spawnItem(toolStack, player.location);
        mat.kill();
        tool.kill();
      }
    }
  }
}, TICK_INTERVAL);

// ==== エフェクト処理 ====
world.afterEvents.entityHit.subscribe(event => {
  const { damagingEntity, hitEntity } = event;
  if (!damagingEntity?.hasTag("player")) return;

  const held = damagingEntity.getComponent("equippable")?.getEquipment("mainhand");
  if (!held) return;

  const lore = held.getLore() ?? [];

  const applyEffect = (name, callback) => {
    const count = lore.filter(l => l.includes(name)).length;
    if (count > 0) callback(count);
  };

  applyEffect("爆発", c => {
    hitEntity.dimension.createExplosion(hitEntity.location, 1.5 + c, { causesFire: false });
  });

  applyEffect("雷", c => {
    for (let i = 0; i < c; i++)
      hitEntity.dimension.spawnEntity("minecraft:lightning_bolt", hitEntity.location);
  });

  applyEffect("凍結", c => {
    hitEntity.runCommandAsync(`effect @s slowness ${3 + c} ${c} true`);
  });

  applyEffect("吸収", c => {
    damagingEntity.runCommandAsync(`effect @s regeneration ${2 + c} 1 true`);
  });

  applyEffect("ノックバック", c => {
    const dir = damagingEntity.getViewDirection();
    hitEntity.applyKnockback(dir.x, dir.z, 0.5 * c, 0.2 * c);
  });

  applyEffect("無音", _ => {
    hitEntity.runCommandAsync(`stopsound @s`);
  });

  applyEffect("連撃", c => {
    damagingEntity.runCommandAsync(`effect @s haste 3 ${c} true`);
  });

  applyEffect("耐性", c => {
    damagingEntity.runCommandAsync(`effect @s resistance 3 ${c} true`);
  });

  applyEffect("暗闇", c => {
    hitEntity.runCommandAsync(`effect @s blindness ${3 + c} 0 true`);
  });

  applyEffect("吹き飛ばし", c => {
    hitEntity.applyKnockback(0, 0, 0, 1 + c);
  });

  applyEffect("炎上", c => {
    hitEntity.setOnFire(3 * c);
  });

  applyEffect("力", c => {
    damagingEntity.runCommandAsync(`effect @s strength ${2 + c} ${c} true`);
  });

  applyEffect("瀕死強化", c => {
    if (damagingEntity.getComponent("health")?.current <= 6) {
      damagingEntity.runCommandAsync(`effect @s strength ${3 + c} ${c} true`);
    }
  });

  applyEffect("仲間割れ", c => {
    if (hitEntity?.typeId !== "minecraft:player") {
      hitEntity.runCommandAsync(`effect @s confusion ${3 + c} 0 true`);
    }
  });

  applyEffect("透明", c => {
    damagingEntity.runCommandAsync(`effect @s invisibility ${3 + c} 0 true`);
  });

  applyEffect("黒炎", c => {
    hitEntity.runCommandAsync(`effect @s wither ${3 + c} 1 true`);
  });

  applyEffect("跳躍加速", c => {
    damagingEntity.runCommandAsync(`effect @s jump_boost ${3 + c} ${c} true`);
    damagingEntity.runCommandAsync(`effect @s speed ${3 + c} ${c} true`);
  });

  applyEffect("引き寄せ", c => {
    const pos = damagingEntity.location;
    hitEntity.teleport(pos, { facingLocation: pos });
  });

  applyEffect("臨界爆発", c => {
    if (Math.random() < 0.05 * c) {
      hitEntity.dimension.createExplosion(hitEntity.location, 4 + c, { causesFire: true });
    }
  });
});
