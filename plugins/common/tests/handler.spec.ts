import { App } from '@koishijs/test-utils'
import { expect } from 'chai'
import { sleep, Session } from 'koishi'
import jest from 'jest-mock'
import * as common from '@koishijs/plugin-common'

const app = new App()

const options: common.Config = {}
app.plugin(common, options)

function receive(session: Partial<Session>) {
  app.receive(session)
  return sleep(0)
}

const receiveFriendRequest = (userId: string) => receive({
  platform: 'mock',
  selfId: app.selfId,
  type: 'friend-request',
  messageId: 'flag',
  userId,
})

const receiveGroupRequest = (userId: string) => receive({
  platform: 'mock',
  selfId: app.selfId,
  type: 'guild-request',
  guildId: '10000',
  messageId: 'flag',
  userId,
})

const receiveGroupMemberRequest = (userId: string) => receive({
  platform: 'mock',
  selfId: app.selfId,
  type: 'guild-member-request',
  guildId: '10000',
  messageId: 'flag',
  userId,
})

const handleFriendRequest = app.bots[0].handleFriendRequest = jest.fn(async () => {})
const handleGuildRequest = app.bots[0].handleGuildRequest = jest.fn(async () => {})
const handleGuildMemberRequest = app.bots[0].handleGuildMemberRequest = jest.fn(async () => {})

describe('Common Handlers', () => {
  beforeEach(() => {
    handleFriendRequest.mockClear()
    handleGuildRequest.mockClear()
    handleGuildMemberRequest.mockClear()
  })

  it('request handler: undefined', async () => {
    await receiveFriendRequest('321')
    expect(handleFriendRequest.mock.calls).to.have.length(0)

    await receiveGroupRequest('321')
    expect(handleGuildRequest.mock.calls).to.have.length(0)

    await receiveGroupMemberRequest('321')
    expect(handleGuildMemberRequest.mock.calls).to.have.length(0)
  })

  it('request handler: string', async () => {
    options.onFriendRequest = 'foo'
    options.onGuildRequest = 'baz'
    options.onGuildMemberRequest = 'bar'

    await receiveFriendRequest('321')
    expect(handleFriendRequest.mock.calls).to.have.shape([['flag', true, 'foo']])

    await receiveGroupRequest('321')
    expect(handleGuildRequest.mock.calls).to.have.shape([['flag', false, 'baz']])

    await receiveGroupMemberRequest('321')
    expect(handleGuildMemberRequest.mock.calls).to.have.shape([['flag', false, 'bar']])
  })

  it('request handler: boolean', async () => {
    options.onFriendRequest = false
    options.onGuildRequest = false
    options.onGuildMemberRequest = false

    await receiveFriendRequest('321')
    expect(handleFriendRequest.mock.calls).to.have.shape([['flag', false]])

    await receiveGroupRequest('321')
    expect(handleGuildRequest.mock.calls).to.have.shape([['flag', false]])

    await receiveGroupMemberRequest('321')
    expect(handleGuildMemberRequest.mock.calls).to.have.shape([['flag', false]])
  })

  it('request handler: function', async () => {
    options.onFriendRequest = () => true
    options.onGuildRequest = () => true
    options.onGuildMemberRequest = () => true

    await receiveFriendRequest('321')
    expect(handleFriendRequest.mock.calls).to.have.shape([['flag', true]])

    await receiveGroupRequest('321')
    expect(handleGuildRequest.mock.calls).to.have.shape([['flag', true]])

    await receiveGroupMemberRequest('321')
    expect(handleGuildMemberRequest.mock.calls).to.have.shape([['flag', true]])
  })
})
