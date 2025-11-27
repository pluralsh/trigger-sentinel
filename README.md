# trigger-sentinel Github Action

Github Action to invoke a Plural Sentinel.  Sentinels are meant to be reusable integration tests that are invocable via API in a number of different integration points.  In this case, if you need to add a multi-cluster or deep infrastructure probe to your Github Actions pipeline, `trigger-sentinel` is likely a good fit.

## Inputs

```yaml
url:
  description: the url of your Plural Console instance
  required: true
token:
  description: the token to use to authenticate with Plural Console
  required: true
sentinel:
  description: the name of the sentinel to trigger
  required: true
wait:
  description: whether to wait on the sentinel to finish
  required: false
```

## Example Usage

```yaml
- name: Authenticate
  id: plural
  uses: pluralsh/setup-plural@v2
  with:
    consoleUrl: https://my.console.cloud.plural.sh
    email: someone@example.com # the email bound to your OIDC federated credential
- name: Trigger PR
  uses: pluralsh/trigger-sentinel@v1
  with:
    url: https://my.console.cloud.plural.sh
    token: ${{ steps.plural.outputs.consoleToken }}
    sentinel: test-sentinel
    wait: 'true'
```

For this to be possible you need to have configured the following:

1. Federated credential to allow `someone@example.com` to exchange a GH actions token for a temporary Plural token.  This token should have at least the scope `createPipelineContext`.
2. A write binding on the `test-sentinel` Sentinel to allow `someone@exmaple.com` to invoke it.  This is not permissible by default unless that user is an admin.
3. The `test-sentinel` sentinel itself.  You can learn more at https://docs.plural.sh/plural-features/plural-ai/sentinels

