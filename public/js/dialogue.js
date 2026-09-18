// A compact combinatorial dialogue pool for the bubble shown after a real
// interaction (see app.js). Crossing a handful of authored interjections with
// a handful of authored core lines yields 100+ perceived-unique reactions per
// companion without hand-writing that many full sentences, and it stays easy
// to grow later - just add another tag or line.
const DIALOGUE = {
  momo: {
    tags: {
      'zh-TW': ['欸嘿', '嘿嘿', '啊', '呀', '嗯哼', '唷', ''],
      en: ['Oh!', 'Hehe', 'Aw', 'Ooh', 'Mm', 'Yay', '']
    },
    lines: {
      'zh-TW': [
        '謝謝你陪我，好開心！', '今天因為你變得特別好～', '我會記得這個的，超珍惜！', '跟你在一起最放鬆了',
        '你是不是又要把我寵壞了', '心情瞬間變得暖暖的', '好想把這個瞬間拍下來', '你對我最好了，真的',
        '感覺又更喜歡你一點了', '今天也想一直黏著你', '有你在，什麼都變得有趣', '這種小小的幸福最珍貴了',
        '我等等要跟你分享更多事', '你注意到了，好感動喔', '想到你就會忍不住笑出來'
      ],
      en: [
        "Thanks for hanging out with me, I'm so happy!", 'You made today so much better.', "I'm totally going to remember this.",
        "I feel the most relaxed when I'm with you.", 'Are you trying to spoil me again?', 'My heart just got all warm and fuzzy.',
        'I wish I could freeze this moment.', "You're the best to me, really.", 'I think I like you a little more now.',
        'I just want to stick close to you today.', "Everything's more fun when you're around.", 'Little moments like this mean the most.',
        "I've got so much more to tell you later.", "You noticed - that means so much.", 'Just thinking about you makes me smile.'
      ]
    }
  },
  aria: {
    tags: {
      'zh-TW': ['嗯', '是啊', '這樣啊', '唔', '好', ''],
      en: ['Mm', 'I see', 'Well', 'Ah', 'Good', '']
    },
    lines: {
      'zh-TW': [
        '謝謝你，這段時間很值得。', '有你在，心裡踏實不少。', '這樣的陪伴，我很珍惜。', '你總是懂得我需要什麼。',
        '心情因此平靜了許多。', '這是今天最安心的片刻。', '我會把這件事記在心上。', '你的用心，我都感受到了。',
        '和你相處總能沉澱下來。', '謝謝你願意花時間陪我。', '這份細膩，只有你做得到。', '心裡某個角落被填滿了。',
        '難得會這麼放鬆地說話。', '你的陪伴比言語更重要。', '這一刻，我很慶幸有你。'
      ],
      en: [
        'Thank you - this time mattered.', 'Having you here settles me.', 'I treasure company like this.',
        'You always seem to know what I need.', 'I feel considerably calmer now.', "This is the most at ease I've felt today.",
        "I'll keep this in mind.", 'I can feel how much thought you put into that.', 'Being with you always grounds me.',
        'Thank you for taking the time.', "Only you'd think of something this thoughtful.", 'Something in me just feels a little fuller.',
        "It's rare I speak this freely.", "Your company means more than words could.", "I'm glad, in this moment, that I have you."
      ]
    }
  },
  mochi: {
    tags: {
      'zh-TW': ['喵', '喵嗚', '哼', '唔喵', '喵～', '啾', ''],
      en: ['Mrow', 'Purr', 'Hmph', 'Mrr', 'Meow~', 'Mew', '']
    },
    lines: {
      'zh-TW': [
        '好啦，勉強算你及格。', '再摸一下也不是不行。', '今天心情還不錯。', '才、才沒有很開心呢。',
        '這樣的話可以再來一次。', '喜歡是喜歡，不要太得意。', '好舒服，別停下來。', '算你識相。',
        '今天的服務還算滿意。', '難得想跟你多待一下。', '這種感覺還挺不賴的。', '哼，勉強原諒你了。',
        '再這樣下去會離不開你。', '好啦好啦，最喜歡了啦。', '這樣就想討好我，太天真了…不過有效。'
      ],
      en: [
        'Fine, I guess that was acceptable.', "I suppose one more pat wouldn't hurt.", 'Not in a bad mood today, for once.',
        "I-I wasn't THAT happy about it.", 'You may do that again, I permit it.', "I like it, don't get smug about it.",
        "That feels nice, don't stop.", 'Good. You know your place.', 'Service was... satisfactory today.',
        "Guess I don't mind sticking around a bit.", "This feeling isn't half bad.", "Hmph, I suppose you're forgiven.",
        "Keep this up and I won't want to leave.", "Okay, okay, you're my favorite, fine.", "Trying to win me over like that... it's working, though."
      ]
    }
  },
  coco: {
    tags: {
      'zh-TW': ['汪', '汪汪', '嘿', '喔耶', '哇', '汪嗚', ''],
      en: ['Woof!', 'Woof woof!', 'Hey!', 'Yay!', 'Whoa!', 'Arf!', '']
    },
    lines: {
      'zh-TW': [
        '太棒了！我最喜歡這樣了！', '再來一次好不好！', '跟你在一起超級開心！', '尾巴都停不下來了！',
        '今天是最棒的一天！', '你是全世界最好的人！', '好想一直這樣玩下去！', '精神都來了，走吧走吧！',
        '這個我超愛的！', '完全捨不得停下來！', '感覺渾身充滿活力！', '這就是我最喜歡的時刻！',
        '你陪我，什麼都好玩！', '開心到想轉圈圈！', '這樣的日子每天都要有！'
      ],
      en: [
        'Best. Thing. Ever!', "Again, again, let's do it again!", 'Being with you is the best!', 'My tail cannot stop wagging!',
        'Today is the greatest day ever!', "You're the best person in the whole world!", 'I never want this to stop!',
        "I've got so much energy now, let's go!", 'I absolutely love this!', "I can't bear to stop!",
        'I feel like I could run forever!', 'This is my favorite moment ever!', "Everything's fun when you're around!",
        "I'm so happy I want to spin in circles!", 'Every day should be like this!'
      ]
    }
  }
};

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function pickReactionLine(companionId, lang) {
  const entry = DIALOGUE[companionId];
  if (!entry) return '';
  const zh = lang === 'zh-TW';
  const key = zh ? 'zh-TW' : 'en';
  const tag = pick(entry.tags[key]);
  const line = pick(entry.lines[key]);
  if (!tag) return line;
  return zh ? `${tag}，${line}` : `${tag} ${line}`;
}
