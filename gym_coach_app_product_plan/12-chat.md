# 12 --- Chat

## Technology

Firebase Realtime Database for realtime chat.

## MVP

One-to-one:

`Coach ↔ Member`

## Chat features

-   text messages
-   sent time
-   read state
-   unread count
-   typing indicator
-   online status where appropriate
-   basic image attachment later

## Conversation entry points

-   Member profile → Chat
-   Coach inbox
-   Member Home → Message Coach

## Suggested RTDB structure

``` text
conversations/
  conversationId/
    members/
    lastMessage/
    updatedAt/

messages/
  conversationId/
    messageId/
      senderId/
      text/
      type/
      createdAt/
      readBy/
```

## Important rule

Do not use Firebase chat data as the authoritative source for
member/coach relationships.

Node.js + MongoDB remains the business source of truth.

## Future

-   group chats
-   broadcast announcements
-   coach team chat
-   voice notes
-   file attachments
