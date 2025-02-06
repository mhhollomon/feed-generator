import {
  OutputSchema as RepoEvent,
  isCommit,
} from './lexicon/types/com/atproto/sync/subscribeRepos'
import { FirehoseSubscriptionBase, getOpsByType } from './util/subscription'

const muwee_id = "did:plc:f3mkgbj4ibmtmn2u4b2dpgid"

export class FirehoseSubscription extends FirehoseSubscriptionBase {
  async handleEvent(evt: RepoEvent) {
    if (!isCommit(evt)) return

    const ops = await getOpsByType(evt)

    // This logs the text of every post off the firehose.
    // Just for fun :)
    // Delete before actually using
    /* for (const post of ops.posts.creates) {
      console.log("--------------------")
      console.log(post.author)
      console.log("--------------------")
      console.log(post.record.text)
    }
*/
    
    const postsToDelete = ops.posts.deletes.map((del) => del.uri)
    const postsToCreate = ops.posts.creates
      .filter((create) => {

        const lowertext = create.record.text.toLowerCase()
        return lowertext.includes('musicweeklies.bsky.social') ||
          lowertext.includes('#muwee') ||
          create.author == muwee_id
      })
      .map((create) => {
        console.log(create.record.text)

        return {
          uri: create.uri,
          cid: create.cid,
          indexedAt: new Date().toISOString(),
          author : create.author,
          feed : 'muwee-posts'
        }
      })

    if (postsToDelete.length > 0) {
      await this.db
        .deleteFrom('post')
        .where('uri', 'in', postsToDelete)
        .execute()
    }
    if (postsToCreate.length > 0) {
      await this.db
        .insertInto('post')
        .values(postsToCreate)
        .onConflict((oc) => oc.doNothing())
        .execute()
    }
  }
}
