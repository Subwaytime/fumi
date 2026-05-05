
<template>
    <!-- Main content area -->
    <h1>Welcome</h1>

    <p v-cloak>Loading indicator</p>

    <p v-once>Rendered once</p>

    <p v-pre>{{ raw }}</p>

    <span v-if="isLoading">Loading...</span>

    <div v-if="user && user.isActive">Active user</div><div v-else="true">Guest</div>

    <span v-if="!hasPermission">Access denied</span><span v-else-if="role === 'admin'">Admin panel</span><span v-else="true">Standard view</span>

    <p v-if="count > 10">Many items</p>

    <p v-if="data ?? fallback">With fallback</p>

    <template v-if="emptyFirst">
        </template><p v-else="true">Only fallback</p>

    <p v-if="emptySecond">Only content</p><template v-else="true">
    </template>

    <template v-if="outer">
        <p v-if="inner">Nested condition</p>
    </template>

    <template v-if="deepA">
        <template v-if="deepB">
            <p v-if="deepC">Deeply nested</p>
        </template>
    </template>

    <p v-show="isVisible">Conditionally visible</p>

    <div v-for="item in items">{{ item.name }}</div>

    <div v-for='(product, index) in products :key="product.id"'>{{ product.title }}</div>

    <span v-for='user in users :key="user.id" :memo="[user.status]"'>{{ user.email }}</span>

    <li v-for='task in tasks :memo="[task.priority]"'>{{ task.label }}</li>

    <template v-for="category in categories">
        <h2>{{ category.name }}</h2>
        <article v-for="article in category.articles">{{ article.title }}</article>
    </template>

    <template v-if="mixed">
    <section>Section header</section>
        <span v-for="tag in tags">{{ tag }}</span>
    </template><template v-else="true">
        <span v-if="alt">Alternative</span>
    </template>

    <template v-if="detail">
        <p>Detail view</p>
        <img v-for="image in images" src="{{ image.src }}" />
    </template>

    <template v-if="summary">
        <p>Summary</p>
        <p>More info</p>
    </template>

    <p v-if="status">Online</p><p v-else="true">Offline</p>

    <template v-if="feature">
        <p>New feature</p>
        <p>Description</p>
        </template><template v-else="true">
        <p>Legacy mode</p>
        <p>Old description</p>
    </template>

    <p v-if="type">Type A</p><p v-else-if="variant">Type B</p><p v-else="true">Type C</p>

    <template v-if="mode">
            <p>Edit</p>
            <p>Form</p>
        </template><template v-else-if="view">
            <p>Read</p>
            <p>Display</p>
    </template>

    <br v-if="breakTest" />
    <img v-if="selfClosing" src="logo.png" />
    <template v-if="commentTest"><!-- debug info -->Text</template>
</template>
