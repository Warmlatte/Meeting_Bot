/**
 * 會議相關訊息的圖片 URL 配置
 * 新增圖片時，只需在對應的陣列中加入新的 URL
 */

// 會議建立成功圖片庫
const MEETING_CREATE_SUCCESS_IMAGES = [
  "https://i.pinimg.com/736x/17/3c/4d/173c4d76b6e991848463e5bf3e5348dc.jpg",
  "https://i.pinimg.com/736x/f0/8b/c4/f08bc4dfe3291afc310a664cb444a8f8.jpg",
  "https://i.pinimg.com/736x/14/03/da/1403da97a66a72a7674466f9cca2286c.jpg",
  "https://i.pinimg.com/originals/56/a6/14/56a614261d423da1825452363174c685.gif",
  "https://i.pinimg.com/originals/e6/29/49/e6294964e26db35f05e41e25e689b19d.gif",
  "https://i.pinimg.com/736x/0b/1b/8d/0b1b8d1fb3539f5ceaf3e94e06be12f7.jpg",
  "https://i.pinimg.com/736x/6a/8f/87/6a8f87a918c79d11a682b614e47ded38.jpg",
  "https://i.pinimg.com/originals/0c/06/bf/0c06bf9748d1f0fe733af51151a7418f.gif",
  "https://i.pinimg.com/736x/de/52/e6/de52e6bdd91834db7bed06aadaabd94d.jpg",
];

// 會議編輯成功圖片庫
const MEETING_EDIT_SUCCESS_IMAGES = [
  "https://i.pinimg.com/originals/81/d3/c8/81d3c893d46be848113b22145b83425b.gif",
  "https://i.pinimg.com/originals/d0/12/ad/d012ad1ad35072d5af468d4ca7325daf.gif",
  "https://i.pinimg.com/736x/6b/f0/02/6bf002f7d30b8ff6aa1fa9c5f3f88b16.jpg",
  "https://i.pinimg.com/736x/17/3c/4d/173c4d76b6e991848463e5bf3e5348dc.jpg",
  "https://i.pinimg.com/736x/f0/8b/c4/f08bc4dfe3291afc310a664cb444a8f8.jpg",
  "https://i.pinimg.com/736x/14/03/da/1403da97a66a72a7674466f9cca2286c.jpg",
  "https://i.pinimg.com/originals/56/a6/14/56a614261d423da1825452363174c685.gif",
  "https://i.pinimg.com/originals/e6/29/49/e6294964e26db35f05e41e25e689b19d.gif",
  "https://i.pinimg.com/736x/0b/1b/8d/0b1b8d1fb3539f5ceaf3e94e06be12f7.jpg",
];

// 會議取消成功圖片庫
const MEETING_CANCEL_SUCCESS_IMAGES = [
  "https://memeprod.ap-south-1.linodeobjects.com/user-maker/e8a6d6307b754b79223efa8bcc6b741f.gif",
  "https://i.pinimg.com/originals/37/31/f0/3731f099e66d6c77440fe9e00ceb0f64.gif",
  "https://i.pinimg.com/736x/17/16/18/1716185bdd04935aff35b9d031e3a752.jpg",
  "https://i.pinimg.com/736x/96/e5/24/96e5243e32fd44789c6e52d55ab1234a.jpg",
  "https://cdn.discordapp.com/attachments/1352213708562235442/1370017704806715492/FB_IMG_1745378473640.jpg?ex=681ff22a&is=681ea0aa&hm=cb6c4bdfd7debeac4e218f60a27b66624128f9e2ca42627af5e3111fa3216857&",
  "https://i.pinimg.com/736x/67/8a/b0/678ab039f2cdbc9cfd1758937d75e3fb.jpg",
  "https://i.pinimg.com/736x/72/74/ac/7274acb293f93b175af89081fab03bdc.jpg",
  "https://i.pinimg.com/736x/d7/b6/8e/d7b68ed24b41e4b9a6ceecd1f96b51e7.jpg",
  "https://media1.tenor.com/m/p-wIO64HN5cAAAAC/wake-up.gif",
  "https://media1.tenor.com/m/2Q2vioFDFEoAAAAd/plankton-plankton-meme.gif",
];

/**
 * 隨機取得一張會議建立成功圖片 URL
 * @returns {string|null} - 隨機圖片 URL，如果陣列為空則回傳 null
 */
export function getRandomMeetingSuccessImage() {
  if (MEETING_CREATE_SUCCESS_IMAGES.length === 0) {
    return null;
  }

  const randomIndex = Math.floor(
    Math.random() * MEETING_CREATE_SUCCESS_IMAGES.length
  );
  return MEETING_CREATE_SUCCESS_IMAGES[randomIndex];
}

/**
 * 隨機取得一張會議編輯成功圖片 URL
 * @returns {string|null} - 隨機圖片 URL，如果陣列為空則回傳 null
 */
export function getRandomMeetingEditSuccessImage() {
  if (MEETING_EDIT_SUCCESS_IMAGES.length === 0) {
    return null;
  }

  const randomIndex = Math.floor(
    Math.random() * MEETING_EDIT_SUCCESS_IMAGES.length
  );
  return MEETING_EDIT_SUCCESS_IMAGES[randomIndex];
}

/**
 * 隨機取得一張會議取消成功圖片 URL
 * @returns {string|null} - 隨機圖片 URL，如果陣列為空則回傳 null
 */
export function getRandomMeetingCancelSuccessImage() {
  if (MEETING_CANCEL_SUCCESS_IMAGES.length === 0) {
    return null;
  }

  const randomIndex = Math.floor(
    Math.random() * MEETING_CANCEL_SUCCESS_IMAGES.length
  );
  return MEETING_CANCEL_SUCCESS_IMAGES[randomIndex];
}

export default {
  MEETING_CREATE_SUCCESS_IMAGES,
  MEETING_EDIT_SUCCESS_IMAGES,
  MEETING_CANCEL_SUCCESS_IMAGES,
  getRandomMeetingSuccessImage,
  getRandomMeetingEditSuccessImage,
  getRandomMeetingCancelSuccessImage,
};
